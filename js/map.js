// import mapboxgl from "https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { drawDoublePies, drawBarChart, drawReviewScoreHistogram } from "./draw.js";

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

function getAvgEstimatedRevenueByNeighbourhood(listings) {
  return d3.rollup(
    listings,
    (v) => d3.mean(v, (d) => d.estimated_revenue_l365d),
    (d) => d.neighbourhood_cleansed
  );
}

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

function createTooltipLegends(tooltipLegends, roomTypes) {
  if (!roomTypes) return;
  Array.from(roomTypes.keys()).forEach((roomType) => {
    const legendItem = tooltipLegends
      .append("div")
      .attr("class", "legend-item");
    legendItem
      .append("div")
      .attr("class", "legend-color")
      .style("background-color", roomTypeColor(roomType));

    legendItem.append("span").text(roomType);
  });
}

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

  return {
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
    superHostRoomTypeCountsAll: groupCount(
      superHostData,
      "room_type"
    ),
    nonSuperHostRoomTypeCountsAll: groupCount(
      nonSuperHostData,
      "room_type"
    ),
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

function setupEventHandlers(svg, agg) {
  const tooltip = d3.select(".tooltip");
  const neighbourhoodName = d3.select("#neighborhood-name");
  const tooltipLegends = d3.select(".tooltip-legends");

  let prevColor;
  svg
    .selectAll("path")
    .on("mouseenter", function (event, d) {
      d3.select(this).style("cursor", "pointer");
      const name = d.properties.neighbourhood;
      neighbourhoodName.text(name);

      // const superMap = agg.superHostRoomTypeCounts.get(name) || new Map();
      // const nonMap = agg.nonSuperHostRoomTypeCounts.get(name) || new Map();

      // drawPie("#pie1-superhost", superMap, roomTypeColor);
      // drawPie("#pie2-non-superhost", nonMap, roomTypeColor);
      // createTooltipLegends(tooltipLegends, agg.allRoomTypeCounts.get(name));

      // tooltip.style("opacity", 1);
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
      d3.select(this).attr("fill", prevColor);
      tooltipLegends.html("");
    })
    .on("click", function (event, d) {
      const name = d.properties.neighbourhood;
      d3.select("#selected-neighborhood-name").text(name);
      drawCompanionGraphs(name, agg);
    });

  svg.on("click", function (event) {
    if (event.target.tagName !== "path") {
      d3.select("#selected-neighborhood-name").text("All");
      drawCompanionGraphs("All", agg);
    }
  });
}

function colorByRoomType(name, agg) {
  let superCount;
  let nonCount;
  if (selectedRoomType === "All") {
    superCount = agg.allCountsByNeighborhood.get("t")?.get(name) || 0;
    nonCount = agg.allCountsByNeighborhood.get("f")?.get(name) || 0;
  } else {
    superCount =
      agg.superHostRoomTypeCounts.get(name)?.get(selectedRoomType) || 0;
    nonCount =
      agg.nonSuperHostRoomTypeCounts.get(name)?.get(selectedRoomType) || 0;
  }

  if (superCount > nonCount) return colorGreaterThan;
  if (nonCount > superCount) return colorLessThan;

  if (superCount === 0 && nonCount === 0) return "#e6e6e6";
  return colorEqual;
}

function colorByReview(name, agg) {
  let superScore;
  let nonScore;
  if (selectedRoomType === "All") {
    superScore = agg.allReviewScoresByNeighborhood.get("t")?.get(name) || 0;
    nonScore = agg.allReviewScoresByNeighborhood.get("f")?.get(name) || 0;
  } else {
    superScore =
      agg.reviewScores.get("t")?.get(name)?.get(selectedRoomType) || 0;
    nonScore = agg.reviewScores.get("f")?.get(name)?.get(selectedRoomType) || 0;
  }
  if (superScore > nonScore) return colorGreaterThan;
  if (nonScore > superScore) return colorLessThan;

  if (superScore === 0 && nonScore === 0) return "#e6e6e6";
  return colorEqual;
}

function updateBasedOnRoomType(roomTypeSelector, reviewCheckBox, svg, agg) {
  roomTypeSelector.on("click", function (event) {
    const clicked = event.target;

    roomTypeSelector.selectAll("button").classed("active", false);
    d3.select(clicked).classed("active", true);

    selectedRoomType = clicked.dataset.value;
    // console.log(selectedRoomType);
    if (selectedRoomType === "All") {
      resetMapColor(svg, agg, reviewCheckBox);
      return;
    }
    // if (selectedRoomType === "All") {
    //   resetMapColor(svg, agg, reviewCheckBox);
    //   drawCompanionGraphs("All", agg);
    //   return;
    // } else {
    //   drawCompanionGraphs("All", agg);
    // }
    svg.selectAll("path").attr("fill", (d) => {
      const name = d.properties.neighbourhood;
      if (reviewCheckBox.checked) {
        return colorByReview(name, agg);
      } else {
        return colorByRoomType(name, agg);
      }
    });
  });
}

function updateBasedOnReview(checkBox, svg, agg) {
  checkBox.addEventListener("change", function () {
    if (selectedRoomType === "All") {
      resetMapColor(svg, agg, checkBox);
      return;
    }

    svg.selectAll("path").attr("fill", (d) => {
      const name = d.properties.neighbourhood;
      if (checkBox.checked) {
        return colorByReview(name, agg);
      }
      return colorByRoomType(name, agg);
    });
  });
}

function resetMapColor(svg, agg, checkBox) {
  svg.selectAll("path").attr("fill", (d) => {
    const name = d.properties.neighbourhood;
    if (checkBox.checked) {
      return colorByReview(name, agg);
    }
    return colorByRoomType(name, agg);
  });
}

function drawCompanionGraphs(name, agg) {
  if (name === "All") {
    drawBarChart({
      dataMap: agg.estimatedRevenueAll,
      svgId: "#avg-revenue-bar",
      title: "Average Est. Revenue by Room Type & Host Type",
      xLabel: "Room Type",
      yLabel: "Average Est. Revenue ($)",
      unit: "$",
      extraText: "Avg Est. revenue",
      // categories: selectedRoomType // TODO: fix this
    });
    drawBarChart({
      dataMap: agg.totalListingsAll,
      svgId: "#total-count-bar",
      title: "Total Listings by Room Type & Host Type",
      xLabel: "Room Type",
      yLabel: "Total Listings",
      unit: "",
      extraText: "Total listings",
      // categories: selectedRoomType // TODO: fix this
    });
    drawReviewScoreHistogram({
      svgId: "#review-score-hist",
      listings: agg.allData,
      title: "Review Score Distribution by Host Type",
    });
    // drawDoublePies({
    //   svgId1: "#pie1-superhost",
    //   countsMap1: agg.superHostRoomTypeCountsAll,
    //   svgId2: "#pie2-non-superhost",
    //   countsMap2: agg.nonSuperHostRoomTypeCountsAll,
    //   roomTypeColor: roomTypeColor,
    // });
  } else {
    drawBarChart({
      dataMap: agg.estimatedRevenue.get(name),
      svgId: "#avg-revenue-bar",
      title: "Average Est. Revenue by Room Type & Host Type",
      xLabel: "Room Type",
      yLabel: "Average Est. Revenue ($)",
      unit: "$",
      extraText: "Avg Est. revenue",
      // categories: selectedRoomType // TODO: fix this
    });
    drawBarChart({
      dataMap: agg.totalListings.get(name),
      svgId: "#total-count-bar",
      title: "Total Listings by Room Type & Host Type",
      xLabel: "Room Type",
      yLabel: "Total Listings",
      unit: "",
      extraText: "Total listings",
      // categories: selectedRoomType // TODO: fix this
    });
    drawReviewScoreHistogram({
      svgId: "#review-score-hist",
      listings: agg.allData.filter((d) => d.neighbourhood_cleansed === name),
      title: "Review Score Distribution by Host Type",
    });
    // const superMap = agg.superHostRoomTypeCounts.get(name) || new Map();
    // const nonMap = agg.nonSuperHostRoomTypeCounts.get(name) || new Map();
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

  const aggregates = prepareAggregates(listingsFiltered);
  const neighbourhoodSelector = d3.select("#neighborhood-select");
  aggregates.countByNeighbourhood.keys().forEach((neighbourhood) => {
    neighbourhoodSelector
      .append("option")
      .attr("value", neighbourhood)
      .text(neighbourhood);
  });

  const roomTypeSelector = d3.select("#room-control");
  aggregates.roomTypes.forEach((roomType) => {
    roomTypeSelector
      .append("button")
      .attr("data-value", roomType)
      .text(roomType);
  });

  const svg = setupMap(geo);
  resetMapColor(svg, aggregates, reviewCheckBox);
  drawCompanionGraphs("All", aggregates);
  setupEventHandlers(svg, aggregates);

  updateBasedOnRoomType(roomTypeSelector, reviewCheckBox, svg, aggregates);
  updateBasedOnReview(reviewCheckBox, svg, aggregates);
});
