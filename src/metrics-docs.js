const { entries } = require("./metrics");

// DOCUMENTATION of queries and their associated metrics (targeted to DBAs)
Object.entries(entries).forEach(([entryName, entry]) => {
  console.log("--[", entryName, "]");
  for (let key in entry.metrics) {
    if (entry.metrics.hasOwnProperty(key)) {
      console.log("--", entry.metrics[key].name, entry.metrics[key].help);
    }
  }
  console.log(entry.query + ";");
  console.log("");
});

console.log("/*");
Object.values(entries).forEach((entry) => {
  for (let key in entry.metrics) {
    if (entry.metrics.hasOwnProperty(key)) {
      console.log(
        "-",
        entry.metrics[key].name + (entry.metrics[key].labelNames.length > 0 ? "{" + entry.metrics[key].labelNames + "}" : ""),
        entry.metrics[key].help
      );
    }
  }
});
console.log("*/");
