// import mapboxgl from "https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import {
  drawDoublePies,
  drawBarChart,
  drawReviewScoreHistogram,
} from "./draw.js";

// console.log("Mapbox GL JS Loaded:", mapboxgl);

// mapboxgl.accessToken =
//   "pk.eyJ1IjoiZGFwaG5leXl5IiwiYSI6ImNtaHlscHlkMTAzNHEybHE0NmJwazZ1eXAifQ.nWfk6iea3oOKQF-lPCWB-w";

// const map = new mapboxgl.Map({
//   container: "map",
//   style: "mapbox://styles/mapbox/streets-v12",
//   center: [-122.4439697, 37.7774487],
//   zoom: 12,
//   minZoom: 5,
//   maxZoom: 18,
// });

const root = getComputedStyle(document.documentElement);
const colorA = root.getPropertyValue("--color-a").trim();
const colorB = root.getPropertyValue("--color-b").trim();
const colorC = root.getPropertyValue("--color-c").trim();
const colorD = root.getPropertyValue("--color-d").trim();
const colorGreaterThan = root.getPropertyValue("--color-greater-than").trim();
const colorLessThan = root.getPropertyValue("--color-less-than").trim();
const colorEqual = root.getPropertyValue("--color-equal").trim();

let roomTypeColor;
let selectedRoomType = "All";

function groupCount(data, ...keys) {
  return d3.rollup(data, (v) => v.length, ...keys.map((k) => (d) => d[k]));
}

function groupMean(data, valueKey, ...keys) {
  return d3.rollup(
    data,
    (v) => d3.mean(v, (d) => d[valueKey]),
    ...keys.map((k) => (d) => d[k])
  );
}

function groupDistinctCount(data, keyDistinct, ...keys) {
  return d3.rollup(
    data,
    (v) => new Set(v.map((d) => d[keyDistinct])).size,
    ...keys.map((k) => (d) => d[k])
  );
}

function createTooltip(
  neighbourhoodName,
  superListingCount,
  nonListingCount,
  superIdCount,
  nonIdCount,
  superAvgReview,
  nonAvgReview
) {
  if (selectedRoomType !== "All") {
    d3.select("#hover-neighborhood-name").text(
      `${neighbourhoodName} (${selectedRoomType})`
    );
  } else {
    d3.select("#hover-neighborhood-name").text(`${neighbourhoodName}`);
  }
  d3.select("#super-listing-count").text(superListingCount);
  d3.select("#non-listing-count").text(nonListingCount);
  d3.select("#super-id-count").text(superIdCount);
  d3.select("#non-id-count").text(nonIdCount);
  d3.select("#super-review-score").text(
    superAvgReview ? superAvgReview.toFixed(2) : "N/A"
  );
  d3.select("#non-review-score").text(
    nonAvgReview ? nonAvgReview.toFixed(2) : "N/A"
  );
}

let cachedAggregates = null;

function prepareAggregates(listingsFiltered) {
  const superHostData = listingsFiltered.filter(
    (d) => d.host_is_superhost === "t"
  );
  const nonSuperHostData = listingsFiltered.filter(
    (d) => d.host_is_superhost === "f"
  );
  const roomTypesArray = Array.from(
    groupCount(listingsFiltered, "room_type").keys()
  );
  roomTypeColor = d3
    .scaleOrdinal()
    .domain(roomTypesArray)
    .range([colorA, colorB, colorC, colorD]);

  cachedAggregates = {
    allData: listingsFiltered,
    roomTypes: roomTypesArray,
    countByNeighbourhood: groupCount(
      listingsFiltered,
      "neighbourhood_cleansed"
    ),
    allCountsByNeighborhood: groupCount(
      listingsFiltered,
      "host_is_superhost",
      "neighbourhood_cleansed"
    ),
    allCounts: groupCount(listingsFiltered, "host_is_superhost"),
    allReviewScoresByNeighborhood: groupMean(
      listingsFiltered,
      "review_scores_rating",
      "host_is_superhost",
      "neighbourhood_cleansed"
    ),
    allReviewScores: groupMean(
      listingsFiltered,
      "review_scores_rating",
      "host_is_superhost"
    ),
    superHostRoomTypeCounts: groupCount(
      superHostData,
      "neighbourhood_cleansed",
      "room_type"
    ),
    nonSuperHostRoomTypeCounts: groupCount(
      nonSuperHostData,
      "neighbourhood_cleansed",
      "room_type"
    ),
    superHostRoomTypeCountsAll: groupCount(superHostData, "room_type"),
    nonSuperHostRoomTypeCountsAll: groupCount(nonSuperHostData, "room_type"),
    allRoomTypeCounts: groupCount(
      listingsFiltered,
      "neighbourhood_cleansed",
      "room_type"
    ),
    reviewScores: groupMean(
      listingsFiltered,
      "review_scores_rating",
      "host_is_superhost",
      "neighbourhood_cleansed",
      "room_type"
    ),
    reviewScoresAll: groupMean(
      listingsFiltered,
      "review_scores_rating",
      "room_type",
      "host_is_superhost"
    ),
    estimatedRevenue: groupMean(
      listingsFiltered,
      "estimated_revenue_l365d",
      "neighbourhood_cleansed",
      "room_type",
      "host_is_superhost"
    ),
    estimatedRevenueAll: groupMean(
      listingsFiltered,
      "estimated_revenue_l365d",
      "room_type",
      "host_is_superhost"
    ),
    totalListingsAll: groupCount(
      listingsFiltered,
      "room_type",
      "host_is_superhost"
    ),
    totalListings: groupCount(
      listingsFiltered,
      "neighbourhood_cleansed",
      "room_type",
      "host_is_superhost"
    ),
    hostIdCounts: groupDistinctCount(
      listingsFiltered,
      "host_id",
      "neighbourhood_cleansed",
      "host_is_superhost"
    ),
    hostIdCountsRoomType: groupDistinctCount(
      listingsFiltered,
      "host_id",
      "neighbourhood_cleansed",
      "room_type",
      "host_is_superhost"
    ),
  };
}

function setupMap(geo) {
  const svg = d3.select("svg");
  const width = 800,
    height = 550;
  const projection = d3.geoMercator().fitSize([width, height], geo);
  const path = d3.geoPath().projection(projection);

  svg.attr("width", width).attr("height", height);

  svg
    .selectAll("path")
    .data(geo.features)
    .join("path")
    .attr("d", path)
    .attr("fill", "#e6e6e6")
    .attr("stroke", "#333");

  return svg;
}

function setupEventHandlers(svg) {
  const tooltip = d3.select(".tooltip");
  const tooltipLegends = d3.select(".tooltip-legends");

  let prevColor;
  svg
    .selectAll("path")
    .on("mouseenter", function (event, d) {
      d3.select(this).style("cursor", "pointer");
      const name = d.properties.neighbourhood;

      let superListingCount,
        nonListingCount,
        superIdCount,
        nonIdCount,
        superAvgReview,
        nonAvgReview;
      if (selectedRoomType === "All") {
        superListingCount =
          cachedAggregates.allCountsByNeighborhood.get("t")?.get(name) || 0;
        nonListingCount =
          cachedAggregates.allCountsByNeighborhood.get("f")?.get(name) || 0;
        superIdCount = cachedAggregates.hostIdCounts.get(name)?.get("t") || 0;
        nonIdCount = cachedAggregates.hostIdCounts.get(name)?.get("f") || 0;
        superAvgReview =
          cachedAggregates.allReviewScoresByNeighborhood.get("t")?.get(name) ||
          0;
        nonAvgReview =
          cachedAggregates.allReviewScoresByNeighborhood.get("f")?.get(name) ||
          0;
      } else {
        const listingsData = cachedAggregates.totalListings
          .get(name)
          ?.get(selectedRoomType);
        superListingCount = listingsData?.get("t") || 0;
        nonListingCount = listingsData?.get("f") || 0;
        const idCountsData = cachedAggregates.hostIdCountsRoomType
          .get(name)
          ?.get(selectedRoomType);
        superIdCount = idCountsData?.get("t") || 0;
        nonIdCount = idCountsData?.get("f") || 0;
        superAvgReview =
          cachedAggregates.reviewScores
            .get("t")
            ?.get(name)
            ?.get(selectedRoomType) || 0;
        nonAvgReview =
          cachedAggregates.reviewScores
            .get("f")
            ?.get(name)
            ?.get(selectedRoomType) || 0;
      }
      createTooltip(
        name,
        superListingCount,
        nonListingCount,
        superIdCount,
        nonIdCount,
        superAvgReview,
        nonAvgReview
      );

      tooltip.style("opacity", 1);
      prevColor = d3.select(this).attr("fill");
      d3.select(this).attr("fill", "#ccc");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px");
    })
    .on("mouseleave", function () {
      tooltip.style("opacity", 0);
      if (prevColor !== null) {
        d3.select(this).attr("fill", prevColor);
      }
      tooltipLegends.html("");
    })
    .on("click", function (event, d) {
      const name = d.properties.neighbourhood;
      d3.select("#selected-neighborhood-name").text(name);
      drawCompanionGraphs(name);
    });

  svg.on("click", function (event) {
    if (event.target.tagName !== "path") {
      d3.select("#selected-neighborhood-name").text("All");
      drawCompanionGraphs("All");
    }
  });
}

function colorByRoomType(name) {
  let superCount;
  let nonCount;
  if (selectedRoomType === "All") {
    superCount =
      cachedAggregates.allCountsByNeighborhood.get("t")?.get(name) || 0;
    nonCount =
      cachedAggregates.allCountsByNeighborhood.get("f")?.get(name) || 0;
  } else {
    superCount =
      cachedAggregates.superHostRoomTypeCounts
        .get(name)
        ?.get(selectedRoomType) || 0;
    nonCount =
      cachedAggregates.nonSuperHostRoomTypeCounts
        .get(name)
        ?.get(selectedRoomType) || 0;
  }

  if (superCount > nonCount) return colorGreaterThan;
  if (nonCount > superCount) return colorLessThan;

  if (superCount === 0 && nonCount === 0) return "#e6e6e6";
  return colorEqual;
}

function colorByReview(name) {
  let superScore;
  let nonScore;
  if (selectedRoomType === "All") {
    superScore =
      cachedAggregates.allReviewScoresByNeighborhood.get("t")?.get(name) || 0;
    nonScore =
      cachedAggregates.allReviewScoresByNeighborhood.get("f")?.get(name) || 0;
  } else {
    superScore =
      cachedAggregates.reviewScores
        .get("t")
        ?.get(name)
        ?.get(selectedRoomType) || 0;
    nonScore =
      cachedAggregates.reviewScores
        .get("f")
        ?.get(name)
        ?.get(selectedRoomType) || 0;
  }
  if (superScore > nonScore) return colorGreaterThan;
  if (nonScore > superScore) return colorLessThan;

  if (superScore === 0 && nonScore === 0) return "#e6e6e6";
  return colorEqual;
}

function updateBasedOnRoomType(roomTypeSelector, reviewCheckBox, svg) {
  roomTypeSelector.on("click", function (event) {
    const clicked = event.target;

    roomTypeSelector.selectAll("button").classed("active", false);
    d3.select(clicked).classed("active", true);

    selectedRoomType = clicked.dataset.value;
    if (selectedRoomType === "All") {
      resetMapColor(svg, reviewCheckBox);
      return;
    }
    // if (selectedRoomType === "All") {
    //   resetMapColor(svg, reviewCheckBox);
    //   drawCompanionGraphs("All");
    //   return;
    // } else {
    //   drawCompanionGraphs("All");
    // }
    svg.selectAll("path").attr("fill", (d) => {
      const name = d.properties.neighbourhood;
      if (reviewCheckBox.checked) {
        return colorByReview(name);
      } else {
        return colorByRoomType(name);
      }
    });
  });
}

function updateBasedOnReview(checkBox, svg) {
  checkBox.addEventListener("change", function () {
    if (selectedRoomType === "All") {
      resetMapColor(svg, checkBox);
      return;
    }

    svg.selectAll("path").attr("fill", (d) => {
      const name = d.properties.neighbourhood;
      if (checkBox.checked) {
        return colorByReview(name);
      }
      return colorByRoomType(name);
    });
  });
}

function resetMapColor(svg, checkBox) {
  svg.selectAll("path").attr("fill", (d) => {
    const name = d.properties.neighbourhood;
    if (checkBox.checked) {
      return colorByReview(name);
    }
    return colorByRoomType(name);
  });
}

function drawCompanionGraphs(name) {
  if (name === "All") {
    drawBarChart({
      dataMap: cachedAggregates.estimatedRevenueAll,
      svgId: "#avg-revenue-bar",
      title: "Average Est. Revenue by Room Type & Host Type",
      xLabel: "Room Type",
      yLabel: "Average Est. Revenue ($)",
      unit: "$",
      extraText: "Avg Est. revenue",
      // categories: selectedRoomType // TODO: fix this
    });
    drawBarChart({
      dataMap: cachedAggregates.totalListingsAll,
      svgId: "#total-count-bar",
      title: "Total Listings by Room Type & Host Type",
      xLabel: "Room Type",
      yLabel: "Total Listings",
      unit: "",
      extraText: "Avg listings",
      // categories: selectedRoomType // TODO: fix this
    });
    drawReviewScoreHistogram({
      svgId: "#review-score-hist",
      listings: cachedAggregates.allData,
      title: "Review Score Distribution by Host Type",
    });
    // drawDoublePies({
    //   svgId1: "#pie1-superhost",
    //   countsMap1: cachedAggregates.superHostRoomTypeCountsAll,
    //   svgId2: "#pie2-non-superhost",
    //   countsMap2: cachedAggregates.nonSuperHostRoomTypeCountsAll,
    //   roomTypeColor: roomTypeColor,
    // });
  } else {
    drawBarChart({
      dataMap: cachedAggregates.estimatedRevenue.get(name),
      svgId: "#avg-revenue-bar",
      title: "Average Est. Revenue by Room Type & Host Type",
      xLabel: "Room Type",
      yLabel: "Average Est. Revenue ($)",
      unit: "$",
      extraText: "Avg Est. revenue",
      // categories: selectedRoomType // TODO: fix this
    });
    drawBarChart({
      dataMap: cachedAggregates.totalListings.get(name),
      svgId: "#total-count-bar",
      title: "Total Listings by Room Type & Host Type",
      xLabel: "Room Type",
      yLabel: "Total Listings",
      unit: "",
      extraText: "Avg listings",
      // categories: selectedRoomType // TODO: fix this
    });
    drawReviewScoreHistogram({
      svgId: "#review-score-hist",
      listings: cachedAggregates.allData.filter(
        (d) => d.neighbourhood_cleansed === name
      ),
      title: "Review Score Distribution by Host Type",
    });
    // const superMap = cachedAggregates.superHostRoomTypeCounts.get(name) || new Map();
    // const nonMap = cachedAggregates.nonSuperHostRoomTypeCounts.get(name) || new Map();
    // drawDoublePies({
    //   svgId1: "#pie1-superhost",
    //   countsMap1: superMap,
    //   svgId2: "#pie2-non-superhost",
    //   countsMap2: nonMap,
    //   roomTypeColor: roomTypeColor,
    // });
  }
}

Promise.all([
  d3.json("data/sept-1-25/neighbourhoods.geojson"),
  d3.csv("data/sept-1-25/listings-full.csv", (d) => ({
    ...d,
    estimated_revenue_l365d: +d.estimated_revenue_l365d.replace(/[$,]/g, ""),
  })),
]).then(([geo, listings]) => {
  const listingsFiltered = listings.filter(
    (d) =>
      d.review_scores_rating !== "" &&
      (d.host_is_superhost === "t" || d.host_is_superhost === "f")
  );
  const reviewCheckBox = d3.select("#metric-toggle").node();

  prepareAggregates(listingsFiltered);
  const neighbourhoodSelector = d3.select("#neighborhood-select");
  cachedAggregates.countByNeighbourhood.keys().forEach((neighbourhood) => {
    neighbourhoodSelector
      .append("option")
      .attr("value", neighbourhood)
      .text(neighbourhood);
  });

  const roomTypeSelector = d3.select("#room-control");
  cachedAggregates.roomTypes.forEach((roomType) => {
    roomTypeSelector
      .append("button")
      .attr("data-value", roomType)
      .text(roomType);
  });

  const svg = setupMap(geo);
  resetMapColor(svg, reviewCheckBox);
  drawCompanionGraphs("All");
  setupEventHandlers(svg);

  updateBasedOnRoomType(roomTypeSelector, reviewCheckBox, svg);
  updateBasedOnReview(reviewCheckBox, svg);
});
