// import mapboxgl from "https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

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
let roomTypeColor;

function getAvgPriceByNeighbourhood(listings) {
  return d3.rollup(
    listings,
    (v) => d3.mean(v, (d) => d.price),
    (d) => d.neighbourhood_cleansed
  );
}

function groupCount(data, ...keys) {
  return d3.rollup(data, (v) => v.length, ...keys.map((k) => (d) => d[k]));
}

function createTooltipLegends(tooltipLegends, roomTypes) {
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

function drawPie(svgId, countsMap) {
  const svg = d3.select(svgId);
  svg.selectAll("*").remove();

  const width = +svg.attr("width"),
    height = +svg.attr("height"),
    radius = Math.min(width, height) / 2;

  const g = svg
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const entries = Array.from(countsMap.keys());
  const values = Array.from(countsMap.values());
  const pie = d3.pie();
  const arcs = pie(values);

  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  g.selectAll("path")
    .data(arcs)
    .join("path")
    .attr("d", arc)
    .attr("fill", (d, i) => roomTypeColor(entries[i]))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1);
}

function prepareAggregates(listingsFiltered) {
  const superHostData = listingsFiltered.filter(
    (d) => d.host_is_superhost === "t"
  );
  const nonSuperHostData = listingsFiltered.filter(
    (d) => d.host_is_superhost === "f"
  );
  const roomTypesArray = Array.from(groupCount(listingsFiltered, "room_type").keys())
  roomTypeColor = d3.scaleOrdinal()
    .domain(roomTypesArray)
    .range(["#ff9999", "#99ccff", "#a5d6a7", "#ffcc80"]);
  console.log("Room Types Array:", roomTypesArray);
  console.log("Room Type Color Scale:", roomTypeColor.domain(), roomTypeColor.range());
  return {
    roomTypes: roomTypesArray,
    avgPriceByNeighbourhood: getAvgPriceByNeighbourhood(listingsFiltered),
    countByNeighbourhood: groupCount(
      listingsFiltered,
      "neighbourhood_cleansed"
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
    allRoomTypeCounts: groupCount(
      listingsFiltered,
      "neighbourhood_cleansed",
      "room_type"
    ),
  };
}

function setupMap(geo) {
  const svg = d3.select("svg");
  const width = 800,
    height = 600;
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
      const name = d.properties.neighbourhood;
      neighbourhoodName.text(name);

      const superMap = agg.superHostRoomTypeCounts.get(name) || new Map();
      const nonMap = agg.nonSuperHostRoomTypeCounts.get(name) || new Map();

      drawPie("#pie1-superhost", superMap);
      drawPie("#pie2-non-superhost", nonMap);
      createTooltipLegends(tooltipLegends, agg.allRoomTypeCounts.get(name));

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
      d3.select(this).attr("fill", prevColor);
      tooltipLegends.html("");
    });
}

function updateBasedOnDropdowns(roomTypeSelector, svg, agg) {
  roomTypeSelector.on("change", function () {
    const selectedRoomType = this.value;
    if (selectedRoomType !== "All") {
      svg.selectAll("path").attr("fill", (d) => {
        const name = d.properties.neighbourhood;

        const superHostC = agg.superHostRoomTypeCounts.get(name) || new Map();
        const nonSuperHostC =
          agg.nonSuperHostRoomTypeCounts.get(name) || new Map();

        const superHostCR = superHostC.get(selectedRoomType) || 0;
        const nonSuperHostCR = nonSuperHostC.get(selectedRoomType) || 0;

        if (superHostCR > nonSuperHostCR) {
          return "#ff9999";
        } else if (nonSuperHostCR > superHostCR) {
          return "#99ccff";
        } else if (superHostCR === 0 && nonSuperHostCR === 0) {
          return "#e6e6e6";
        } else {
          return "#ff6666";
        }
      });
    } else {
      svg.selectAll("path").attr("fill", "#e6e6e6");
    }
  });
}

Promise.all([
  d3.json("data/sept-1-25/neighbourhoods.geojson"),
  d3.csv("data/sept-1-25/listings-full.csv", (d) => ({
    ...d,
    price: +d.price.replace(/[$,]/g, ""),
  })),
]).then(([geo, listings]) => {
  const listingsFiltered = listings.filter(
    (d) => d.review_scores_rating !== ""
  );

  const aggregates = prepareAggregates(listingsFiltered);
  console.log(aggregates);
  const roomTypes = aggregates.roomTypes;
  const svg = setupMap(geo);

  setupEventHandlers(svg, aggregates);

  const neighbourhoodSelector = d3.select("#neighborhood-select");
  aggregates.countByNeighbourhood.keys().forEach((neighbourhood) => {
    neighbourhoodSelector
      .append("option")
      .attr("value", neighbourhood)
      .text(neighbourhood);
  });

  const roomTypeSelector = d3.select("#room-type-select");
  roomTypes.forEach((roomType) => {
    roomTypeSelector.append("option").attr("value", roomType).text(roomType);
  });

  updateBasedOnDropdowns(roomTypeSelector, svg, aggregates);
});
