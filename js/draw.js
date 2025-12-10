import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let colors = ["darkorange", "steelblue"];

function drawEmptyChart(svg, width, height, title, xLabel, yLabel) {
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .text(title);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(xLabel);

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(yLabel);

  svg
    .append("text")
    .classed("no-data-text", true)
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "#888")
    .text("No data available for this neighborhood");
}

function createTopLegend(svg, width, margin, extraText = "") {
  const legend = svg
    .append("g")
    .attr("transform", `translate(${width / 2 - 110}, ${margin.top - 5})`);

  const legend1 = legend.append("g").attr("transform", `translate(0, ${margin.top * -0.5})`);

  legend1
    .append("rect")
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", colors[0])
    .attr("opacity", 1);

  legend1
    .append("text")
    .attr("x", 20)
    .attr("y", 12)
    .style("font-size", "12px")
    .text("Superhost");

  const legend2 = legend.append("g").attr("transform", `translate(100, ${margin.top * -0.5})`);

  legend2
    .append("rect")
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", colors[1])
    .attr("opacity", 1);

  legend2
    .append("text")
    .attr("x", 20)
    .attr("y", 12)
    .style("font-size", "12px")
    .text("Non-superhost");

  const legend3 = legend.append("g").attr("transform", `translate(0, ${margin.top * -0.3})`);

  legend3
  .append("line")
      .attr("x1", 0)
      .attr("x2", 14)
      .attr("y1", 7)
      .attr("y2", 7)
      .attr("stroke", d3.color(colors[0]).darker(1.2))
      .attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "4 4")
      .attr("opacity", 1);

  legend3
    .append("text")
    .attr("x", 20)
    .attr("y", 12)
    .style("font-size", "12px")
    .text(`${extraText} - Superhost`)
    .style("fill", d3.color(colors[0]).darker(1.4));

  const legend4 = legend.append("g").attr("transform", `translate(0, ${margin.top * -0.1})`);

  legend4
  .append("line")
      .attr("x1", 0)
      .attr("x2", 14)
      .attr("y1", 7)
      .attr("y2", 7)
      .attr("stroke", d3.color(colors[1]).darker(1.2))
      .attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "4 4")
      .attr("opacity", 1);

  legend4
    .append("text")
    .attr("x", 20)
    .attr("y", 12)
    .style("font-size", "12px")
    .text(`${extraText} - Non-superhost`)
    .style("fill", d3.color(colors[1]).darker(1.4));

}

function removeExistingChartElements(svg) {
  svg.selectAll(".bar-group").remove();
  svg.selectAll(".avg-line").remove();
  svg.selectAll(".legend").remove();
  svg.selectAll(".chart-title").remove();
  svg.selectAll(".dotted-line").remove();
  svg.selectAll(".dotted-line-text").remove();
  svg.selectAll(".no-data-text").remove();
}

function removeAllChartElements(svg) {
  svg.selectAll("*").remove();
}

export function drawDoublePies({ svgId1, svgId2, countsMap1, countsMap2, roomTypeColor }) {

  // const svg1 = d3.select(svgId1);
  // const svg2 = d3.select(svgId2);

  // const noData =
  //   !countsMap1 || countsMap1.size === 0 ||
  //   !countsMap2 || countsMap2.size === 0;

  // if (noData) {
  //   svg1.selectAll("*").remove();
  //   svg2.selectAll("*").remove();
  //   drawEmptyPie(svgId1);

  //   return; // <-- Do NOT draw pies
  // }

  // Otherwise draw both pies
  drawPie({ svgId: svgId1, countsMap: countsMap1, roomTypeColor });
  drawPie({ svgId: svgId2, countsMap: countsMap2, roomTypeColor });
}

export function drawPie({ svgId, countsMap, roomTypeColor }) {
  const svg = d3.select(svgId);
  removeExistingChartElements(svg);

  const width = +svg.attr("width");
  const height = +svg.attr("height");

  const titleOffset = 18;
  const radius = Math.min(width, height - titleOffset) * 0.4;

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-weight", "600")
    .text(svg.attr("data-title"));

  const g = svg
    .append("g")
    .attr(
      "transform",
      `translate(${width / 2}, ${(height + titleOffset) / 2})`
    );

  const entries = Array.from(countsMap.keys());
  const values = Array.from(countsMap.values());
  const total = d3.sum(values);

  const pie = d3.pie();
  const arcs = pie(values);

  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  const labelArc = d3.arc()
    .innerRadius(radius * 0.55)
    .outerRadius(radius * 0.55);

  g.selectAll("path")
    .data(arcs)
    .join("path")
    .attr("d", arc)
    .attr("fill", (d, i) => roomTypeColor(entries[i]))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1);

  g.selectAll("text")
    .data(arcs)
    .join("text")
    .text((d) => {
      const pct = (d.data / total) * 100;
      return pct >= 5 ? `${pct.toFixed(1)}%` : "";
    })
    .attr("transform", (d) => `translate(${labelArc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .style("font-size", "10px")
    .style("fill", "#333")
    .style("pointer-events", "none");
}



export function drawBarChart({
  dataMap,
  svgId,
  width = 450,
  height = 350,
  title = "",
  xLabel = "",
  yLabel = "",
  unit = "",
  extraText = "",
  categories = "All"
}) {
  const svg = d3.select(svgId).attr("width", width).attr("height", height);
  removeExistingChartElements(svg);

  if (!dataMap || dataMap.size === 0) {
    removeAllChartElements(svg);
    drawEmptyChart(svg, width, height, title, xLabel, yLabel);
    return;
  }

  const margin = { top: 90, right: 80, bottom: 50, left: 80 };
  categories = (categories === "All")
    ? Array.from(dataMap.keys())
    : [categories];
  const subcategories = ["t", "f"];
  const maxValue = d3.max(categories, (cat) =>
    d3.max(subcategories, (sub) => dataMap.get(cat).get(sub) || 0)
  );

  const x0 = d3
    .scaleBand()
    .domain(categories)
    .range([margin.left, width - margin.right])
    .padding(0.05);

  const x1 = d3
    .scaleBand()
    .domain(subcategories)
    .range([0, x0.bandwidth()])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal().domain(subcategories).range(colors);

  let xAxisG = svg.select(".x-axis");
  let yAxisG = svg.select(".y-axis");

  if (xAxisG.empty()) {
    xAxisG = svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height - margin.bottom})`);
  }
  if (yAxisG.empty()) {
    yAxisG = svg
      .append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${margin.left},0)`);
  }
  
  const xAxis = d3.axisBottom(x0);
  const yAxis = d3.axisLeft(y);

  xAxisG.transition().duration(1000).ease(d3.easeCubic).call(xAxis);
  yAxisG.transition().duration(1000).ease(d3.easeCubic).call(yAxis);

  const groups = svg
    .selectAll("g.group")
    .data(categories)
    .join("g")
    .attr("class", "group")
    .attr("transform", (d) => `translate(${x0(d)},0)`);

  groups
    .selectAll("rect")
    .data((cat) =>
      subcategories.map((sub) => ({
        category: cat,
        sub,
        value: dataMap.get(cat).get(sub) || 0,
      }))
    )
    .join("rect")
    .attr("x", (d) => x1(d.sub))
    .attr("width", x1.bandwidth())
    .attr("fill", (d) => color(d.sub))
    .attr("y", y(0))
    .attr("height", 0)
    .transition()
    .duration(800)
    .ease(d3.easeCubicOut)
    .attr("y", (d) => y(d.value))
    .attr("height", (d) => y(0) - y(d.value));


  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .text(title);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(xLabel);

  svg
    .append("text")
    .attr("transform", `rotate(-90)`)
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(yLabel);

  const avgSuper = d3.mean(
    Array.from(dataMap.values(), (m) => m.get("t") || 0)
  );
  if (avgSuper) {
    addLine(
      svg,
      "avg-line avg-line-super",
      margin.left,
      width - margin.right,
      y(avgSuper),
      y(avgSuper),
      colors[0],
      avgSuper,
      unit
    );
  }
  const avgNonSuper = d3.mean(
    Array.from(dataMap.values(), (m) => m.get("f") || 0)
  );
  if (avgNonSuper) {
    addLine(
      svg,
      "avg-line avg-line-non-super",
      margin.left,
      width - margin.right,
      y(avgNonSuper),
      y(avgNonSuper),
      colors[1],
      avgNonSuper,
      unit
    );
  }
  createTopLegend(svg, width, margin, extraText);
}

export function drawReviewScoreHistogram({
  svgId,
  listings,
  width = 450,
  height = 350,
  title = "Histogram of Review Scores by Host Type",
  xLabel = "Review Score",
  yLabel = "Count"
}) {
  const svg = d3.select(svgId).attr("width", width).attr("height", height);
  svg.selectAll("*").remove();

  const margin = { top: 80, right: 20, bottom: 50, left: 65 };

  const superScores = listings
    .filter((d) => d.host_is_superhost === "t" && d.review_scores_rating)
    .map((d) => +d.review_scores_rating);

  const nonSuperScores = listings
    .filter((d) => d.host_is_superhost === "f" && d.review_scores_rating)
    .map((d) => +d.review_scores_rating);

  if (superScores.length === 0 && nonSuperScores.length === 0) {
    drawEmptyChart(svg, width, height, title, xLabel, yLabel);
    return;
  }

  const validMins = [];
  const validMaxs = [];

  if (superScores.length > 0) {
    validMins.push(d3.min(superScores));
    validMaxs.push(d3.max(superScores));
  }
  if (nonSuperScores.length > 0) {
    validMins.push(d3.min(nonSuperScores));
    validMaxs.push(d3.max(nonSuperScores));
  }

  const minScore = d3.min(validMins);
  const maxScore = d3.max(validMaxs);

  const x = d3
    .scaleLinear()
    .domain([minScore, maxScore])
    .range([margin.left, width - margin.right]);

  const histogram = d3.histogram().domain(x.domain()).thresholds(x.ticks(15));

  const binsSuper = histogram(superScores);
  const binsNon = histogram(nonSuperScores);

  const y = d3
    .scaleLinear()
    .domain([
      0,
      Math.max(
        d3.max(binsSuper, (d) => d.length),
        d3.max(binsNon, (d) => d.length)
      ),
    ])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .selectAll("rect.super")
    .data(binsSuper)
    .join("rect")
    .attr("class", "super")
    .attr("x", (d) => x(d.x0) + 1)
    .attr("y", (d) => y(d.length))
    .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("height", (d) => y(0) - y(d.length))
    .attr("fill", colors[0])
    .attr("opacity", 0.6);

  svg
    .append("g")
    .selectAll("rect.non")
    .data(binsNon)
    .join("rect")
    .attr("class", "non")
    .attr("x", (d) => x(d.x0) + 1)
    .attr("y", (d) => y(d.length))
    .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("height", (d) => y(0) - y(d.length))
    .attr("fill", colors[1])
    .attr("opacity", 0.6);

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .text(title);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(xLabel);

  svg
    .append("text")
    .attr("transform", `rotate(-90)`)
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(yLabel);

  const avgReviewSuper = d3.mean(superScores);
  const avgReviewNonSuper = d3.mean(nonSuperScores);
  let xSuper = x(avgReviewSuper);
  let xNonSuper = x(avgReviewNonSuper);

  if (avgReviewSuper) {
    addLine(
      svg,
      "avg-line avg-line-super",
      xSuper,
      xSuper,
      margin.top,
      height - margin.bottom,
      colors[0],
      Number(avgReviewSuper.toFixed(2))
    );
  }
  if (avgReviewNonSuper) {
    addLine(
      svg,
      "avg-line avg-line-non-super",
      xNonSuper,
      xNonSuper,
      margin.top,
      height - margin.bottom,
      colors[1],
      Number(avgReviewNonSuper.toFixed(2))
    );
  }
  createTopLegend(svg, width, margin, "Avg review");
}

function addLine(svg, cls, x1, x2, y1, y2, color, value, unit="") {
  svg
    .append("line")
    .attr("class", cls)
    .attr("data-value", value)
    .attr("data-unit", unit)
    .attr("x1", x1)
    .attr("x2", x2)
    .attr("y1", y1)
    .attr("y2", y2)
    .attr("stroke", d3.color(color).darker(1.2))
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "20 4")
    .attr("opacity", 1)
    .on("mouseenter", function (event) {
      d3.select(this).style("cursor", "pointer");
    })
    .on("mouseover", function () {
      d3.select(this).attr("stroke-width", 2.5);
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke-width", 2);
    });
}