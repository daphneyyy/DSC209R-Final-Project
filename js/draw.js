import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

function drawEmptyChart(svg, width, height, title, xLabel, yLabel) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .text(title);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(xLabel);

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(yLabel);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "#888")
    .text("No data available for this neighborhood");
}

export function drawPie(svgId, countsMap, roomTypeColor) {
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

export function drawBarChart({
  dataMap,
  svgId,
  width = 450,
  height = 350,
  title = "",
  xLabel = "",
  yLabel = "",
  colors = ["darkorange", "steelblue"],
}) {
  const svg = d3.select(svgId).attr("width", width).attr("height", height);
  svg.selectAll("*").remove();

  if (!dataMap || dataMap.size === 0) {
    drawEmptyChart(svg, width, height, title, xLabel, yLabel);
    return;
  }

  const margin = { top: 40, right: 20, bottom: 50, left: 80 };

  const categories = Array.from(dataMap.keys());
  const subcategories = ["t", "f"];
  const subcategoryLabels = { "t": "Superhost", "f": "Non-superhost" };

  const maxValue = d3.max(categories, (cat) =>
    d3.max(subcategories, (sub) => dataMap.get(cat).get(sub) || 0)
  );

  const x0 = d3.scaleBand()
    .domain(categories)
    .range([margin.left, width - margin.right])
    .padding(0.05);

  const x1 = d3.scaleBand()
    .domain(subcategories)
    .range([0, x0.bandwidth()])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal().domain(subcategories).range(colors);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x0));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

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
    .attr("y", (d) => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => y(0) - y(d.value))
    .attr("fill", (d) => color(d.sub));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .text(title);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(xLabel);

  svg.append("text")
    .attr("transform", `rotate(-90)`)
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(yLabel);

  const legend = svg.append("g")
    .attr("transform", `translate(${width - 180}, ${margin.top})`);

  subcategories.forEach((sub, i) => {
    legend.append("rect")
      .attr("x", 0)
      .attr("y", i * 20)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", color(sub));

    legend.append("text")
      .attr("x", 20)
      .attr("y", i * 20 + 12)
      .style("font-size", "12px")
      .text(subcategoryLabels[sub]);
  });
}

export function drawReviewScoreHistogram({
  svgId,
  listings,
  width = 450,
  height = 350,
  title = "Histogram of Review Scores by Host Type",
  xLabel = "Review Score",
  yLabel = "Count",
  colors = ["darkorange", "steelblue"],
}) {
  const svg = d3.select(svgId).attr("width", width).attr("height", height);
  svg.selectAll("*").remove();

  const margin = { top: 40, right: 20, bottom: 50, left: 80 };

  const superScores = listings
    .filter(d => d.host_is_superhost === "t" && d.review_scores_rating)
    .map(d => +d.review_scores_rating);

  const nonSuperScores = listings
    .filter(d => d.host_is_superhost === "f" && d.review_scores_rating)
    .map(d => +d.review_scores_rating);

  if (superScores.length === 0 && nonSuperScores.length === 0) {
    drawEmptyChart(svg, width, height, title, xLabel, yLabel);
    return;
  }

  const x = d3.scaleLinear()
    .domain([3.0, 5.0])
    .range([margin.left, width - margin.right]);

  const histogram = d3.histogram()
    .domain(x.domain())
    .thresholds(x.ticks(15));

  const binsSuper = histogram(superScores);
  const binsNon = histogram(nonSuperScores);

  const y = d3.scaleLinear()
    .domain([
      0,
      Math.max(
        d3.max(binsSuper, d => d.length),
        d3.max(binsNon, d => d.length)
      )
    ])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .selectAll("rect.super")
    .data(binsSuper)
    .join("rect")
      .attr("class", "super")
      .attr("x", d => x(d.x0) + 1)
      .attr("y", d => y(d.length))
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("height", d => y(0) - y(d.length))
      .attr("fill", colors[0])
      .attr("opacity", 0.6);

  svg.append("g")
    .selectAll("rect.non")
    .data(binsNon)
    .join("rect")
      .attr("class", "non")
      .attr("x", d => x(d.x0) + 1)
      .attr("y", d => y(d.length))
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("height", d => y(0) - y(d.length))
      .attr("fill", colors[1])
      .attr("opacity", 0.6);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .text(title);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(xLabel);

  svg.append("text")
    .attr("transform", `rotate(-90)`)
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(yLabel);

  const legend = svg.append("g")
    .attr("transform", `translate(${width - 180}, ${margin.top})`);

  legend.append("rect")
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", colors[0])
    .attr("opacity", 0.6);

  legend.append("text")
    .attr("x", 20)
    .attr("y", 12)
    .style("font-size", "12px")
    .text("Superhost");

  legend.append("rect")
    .attr("y", 20)
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", colors[1])
    .attr("opacity", 0.6);

  legend.append("text")
    .attr("x", 20)
    .attr("y", 32)
    .style("font-size", "12px")
    .text("Non-superhost");
}
