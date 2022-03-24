const { metrics } = require("./metrics");

// DOCUMENTATION of queries and their associated metrics (targeted to DBAs)
metrics.forEach(function (m) {
  for (let key in m.metrics) {
    if (m.metrics.hasOwnProperty(key)) {
      console.log("--", m.metrics[key].name, m.metrics[key].help);
    }
  }
  console.log(m.query + ";");
  console.log("");
});

console.log("/*");
metrics.forEach(function (m) {
  for (let key in m.metrics) {
    if (m.metrics.hasOwnProperty(key)) {
      console.log("- ", m.metrics[key].name + (m.metrics[key].labelNames.length > 0 ? "{" + m.metrics[key].labelNames + "}" : ""), m.metrics[key].help);
    }
  }
});
console.log("*/");
