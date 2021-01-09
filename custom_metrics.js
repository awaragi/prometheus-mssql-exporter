/**
 * Functions for reading and parsing yaml file as additional metric queries
 */
const fs = require('fs');
const yaml = require('js-yaml');
const client = require('prom-client');

/**
 * Function that reads and parses a yaml file into metric objects
 *
 * @param yaml_path the path to the yaml file
 *
 * @returns Array of query-based metrics objects
 * @returns Error
 */
function parse_metrics(yaml_path) {
    let metrics = []
    let file, raw_metrics
    try {
        file = fs.readFileSync(yaml_path, 'utf8')
    } catch (error) {
        return [[], error]        
    }
    
    try {
        raw_metrics = yaml.load(file)
    } catch (error) {
        return [[], error]        
    }

    // Our user-defined queries have a top-level name to make it easier to read
    // but we don't require that top-level information, so we unwrap the value
    for (let raw_metric in raw_metrics) {
        metrics.push(build_metric_object(raw_metrics[raw_metric]))
    }

    return [metrics, null]
}

/**
 * Function that reads JS object and returns metric object ussable in index.js
 *
 * @param metric_json Metric in json form
 * example: 
 *  { 
        metrics: [ {
            name: 'mssql_instance_local_time_custom',
            help: 'Number of seconds since epoch on local instance (custom version)',
            labelnames: [ 'state' ] 
        } ],
        query: 'SELECT DATEDIFF(second, \'19700101\', GETUTCDATE())',
        collect: { 
            per_row: false 
        } 
    }
 *
 * @returns object usable by index.js; see metrics.js for examples
 */
function build_metric_object(metric_json) {
    gauges_object = {}
    for (let raw_gauge of metric_json.metrics) {
        gauges_object[raw_gauge["name"]] = new client.Gauge(raw_gauge)
    }
    return {
        metrics: gauges_object,
        query: metric_json["query"],
        collect: build_collect_function(metric_json)
    }
}

/**
 * Function that reads JS object and returns collect function
 *
 * @param metric_json Metric in json forml; see queries.yaml for examples
 *
 * @returns function
 */
function build_collect_function(metric_json) {
    function collector (rows, metrics) {
        // Metrics are returned as a series of either one or more rows
        for (let row_pos = 0; row_pos < rows.length; row_pos++) {
            let row = rows[row_pos];
            // For each row, we will collect each metric, including the labels specified
            for (let i = 0; i < metric_json.collect.metrics.length; i++) {
                let labels = {}
                if (metric_json.collect.metrics[i].shared_labels) {
                    label = add_labels({}, metric_json.collect.metrics[i].shared_labels, row)
                }
                for (let position_obj of metric_json.collect.metrics[i].submetrics) {
                    const fetched_value = row[position_obj.position].value;
                    if (position_obj.name) {
                        debug("Fetch ", metric_json.metrics[i].name, position_obj.name, fetched_value);
                    } else {
                        debug("Fetch ", metric_json.metrics[i].name, fetched_value);
                    }
                    let final_labels = labels
                    if (position_obj.additional_label) {
                        final_labels = add_labels(labels, position_obj.additional_label, row)
                    }
                    if (Object.keys(final_labels).length != 0) {
                        metrics[metric_json.metrics[i].name].set(final_labels, fetched_value);
                    } else {
                        metrics[metric_json.metrics[i].name].set(fetched_value);
                    }    
                }
            }
        }
    }

    return collector
}

/**
 * Function for parsing labels for metrics
 *
 * @param labels dictionary to add to
 * @param raw_labels raw labels JSON
 * @param row current MSSQL row
 *
 * @returns labels_return dictionary of labels (cloned from original)
 */
function add_labels(labels, raw_labels, row) {
    labels_return = Object.assign({}, labels);
    for (let label_obj of raw_labels) {
        // Labels can either be defined or dynamically collected from the rows
        if (label_obj.value) {
            labels_return[label_obj.key] = label_obj.value
        } else {
            labels_return[label_obj.key] = row[label_obj.position].value
        }
    }
    return labels_return
}

module.exports = {
    parse_metrics: parse_metrics,
};
