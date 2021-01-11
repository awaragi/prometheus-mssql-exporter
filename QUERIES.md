# Guide to writing queries in yaml form

A query in yaml consists of a top-level name, like `mssql_instance_local_time`, with three children:

* `metrics`: a list of the new Prometheus gauges to register, consisting of a name, help, and labelNames
* `query`: the mssql query to invoke to get the metrics
* `collect`: a multi-level structure to be turned into a collect function that turns the raw output of the query into a Prometheus metric

The `collect` field has the following structure:

```yaml
collect:            # Top level name
  metrics:          # An array of metrics that match the gauges defined in the `metrics` field above; each Prometheus gauge can actually include multiple expressed metrics, though most of the time there is a one-to-one relation between gauges and metrics
```

In the `collect.metrics` array, the metric object has the following structure:

* `shared_labels`: for defining labels that are shared by all the entries in that metric
* `submetrics`: an array of submetric objects; a submetric object defines what position (in the mssql row) the metric actually comes from, as well as any labels that are specific to that submetric

For instance, the following defines a single metric with no shared labels where the data is in the 0th position of the received row:

```yaml
- submetrics:
    - position: 0
```

For another example, the following defines a single metric where each row's data will share the labels `database` (derived from the 0th column in the row) and `state` (statically set to `current`); the value of that metric will be derived from the 1st position of the received row.

```yaml
- shared_labels: 
    - key: database
      position: 0
    - key: state
      value: current 
  submetrics:
    - position: 1
```

Multiple submetrics may be derived from a single metric, as when a mssql query returns two values, both of which you want to forward to Prometheus as separate values:

```yaml
- submetrics:
    - position: 0
- submetrics:
    - position: 1
```

For a final example, say that you had a query similar to the current `mssql_io_stall` metric in [metrics.js](metrics.js) which has one gauge that includes several separate labeled metrics. That can be expressed in the following:

```yaml
- shared_labels: 
    - key: database
      position: 0
  submetrics:
    - position: 1
      name: read
      additional_labels:
        - key: type
          value: "read"
    - position: 2
      name: write
      additional_labels:
        - key: type
          value: "write"
    - position: 4
      name: queued_read
      additional_labels:
        - key: type
          value: "queued_read"
    - position: 5
      name: queued_write
      additional_labels:
        - key: type
          value: "queued_write"
```

To step through this, each of these metrics has a database label (derived from the 0th position of the row); but each row actually contains several metrics at different positions. We add additional labels on a per-metric basis (with key/value as our structure); the `name` entry of the submetric is included for debugging purposes.

## Creating new queries

To create and debug queries, you can add your custom queries to the file, and pass in that value on the command line to the `metrics.js` file, which will print out the query information.

```bash
CUSTOM_METRICS_PATH=./queries.yaml node ./metrics.js
```

TODO: A debugging tool would be a useful addition.
