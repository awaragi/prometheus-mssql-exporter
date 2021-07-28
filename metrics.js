/**
 * Collection of metrics and their associated SQL requests
 * Created by Pierre Awaragi
 */
const debug = require("debug")("metrics");
const client = require('prom-client');

// UP metric
const up = new client.Gauge({name: 'mssql_up', help: "UP Status"});

// Query based metrics
// -------------------
const mssql_instance_local_time = {
    metrics: {
        mssql_instance_local_time: new client.Gauge({name: 'mssql_instance_local_time', help: 'Number of seconds since epoch on local instance'})
    },
    query: `SELECT DATEDIFF(second, '19700101', GETUTCDATE())`,
    collect: function (rows, metrics) {
        const mssql_instance_local_time = rows[0][0].value;
        debug("Fetch current time", mssql_instance_local_time);
        metrics.mssql_instance_local_time.set(mssql_instance_local_time);
    }
};

const mssql_connections = {
    metrics: {
        mssql_connections: new client.Gauge({name: 'mssql_connections', help: 'Number of active client connections', labelNames: ['client', 'database']})
    },
    query: `SELECT host_name, DB_NAME(database_id), COUNT(*)
FROM sys.dm_exec_sessions
WHERE is_user_process=1
GROUP BY host_name, database_id`,
    collect: function (rows, metrics) {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const client = row[0].value;
            const database = row[1].value;
            const mssql_connections = row[2].value;
            debug("Fetch number of connections for client", client, database, mssql_connections);
            metrics.mssql_connections.set({client, database}, mssql_connections);
        }
    }
};

const mssql_deadlocks = {
    metrics: {
        mssql_deadlocks_per_second: new client.Gauge({name: 'mssql_deadlocks', help: 'Number of lock requests per second that resulted in a deadlock since last restart'})
    },
    query: `SELECT cntr_value
FROM sys.dm_os_performance_counters
WHERE counter_name = 'Number of Deadlocks/sec' AND instance_name = '_Total'`,
    collect: function (rows, metrics) {
        const mssql_deadlocks = rows[0][0].value;
        debug("Fetch number of deadlocks/sec", mssql_deadlocks);
        metrics.mssql_deadlocks_per_second.set(mssql_deadlocks)
    }
};

const mssql_user_errors = {
    metrics: {
        mssql_user_errors: new client.Gauge({name: 'mssql_user_errors', help: 'Number of user errors/sec since last restart'})
    },
    query: `SELECT cntr_value
FROM sys.dm_os_performance_counters
WHERE counter_name = 'Errors/sec' AND instance_name = 'User Errors'`,
    collect: function (rows, metrics) {
        const mssql_user_errors = rows[0][0].value;
        debug("Fetch number of user errors/sec", mssql_user_errors);
        metrics.mssql_user_errors.set(mssql_user_errors)
    }
};

const mssql_kill_connection_errors = {
    metrics: {
        mssql_kill_connection_errors: new client.Gauge({name: 'mssql_kill_connection_errors', help: 'Number of kill connection errors/sec since last restart'})
    },
    query: `SELECT cntr_value
FROM sys.dm_os_performance_counters
WHERE counter_name = 'Errors/sec' AND instance_name = 'Kill Connection Errors'`,
    collect: function (rows, metrics) {
        const mssql_kill_connection_errors = rows[0][0].value;
        debug("Fetch number of kill connection errors/sec", mssql_kill_connection_errors);
        metrics.mssql_kill_connection_errors.set(mssql_kill_connection_errors)
    }
};

const mssql_database_state = {
    metrics: {
        mssql_database_state: new client.Gauge({name: 'mssql_database_state', help: 'Databases states: 0=ONLINE 1=RESTORING 2=RECOVERING 3=RECOVERY_PENDING 4=SUSPECT 5=EMERGENCY 6=OFFLINE 7=COPYING 10=OFFLINE_SECONDARY', labelNames: ['database']}),
    },
    query: `SELECT name,state FROM master.sys.databases`,
    collect: function (rows, metrics) {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const database = row[0].value;
            const mssql_database_state = row[1].value;
            debug("Fetch state for database", database);
            metrics.mssql_database_state.set({database}, mssql_database_state);
        }
    }
};

const mssql_log_growths = {
    metrics: {
        mssql_log_growths: new client.Gauge({name: 'mssql_log_growths', help: 'Total number of times the transaction log for the database has been expanded last restart', labelNames: ['database']}),
    },
    query: `SELECT rtrim(instance_name),cntr_value
FROM sys.dm_os_performance_counters
WHERE counter_name = 'Log Growths' AND instance_name <> '_Total'`,
    collect: function (rows, metrics) {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const database = row[0].value;
            const mssql_log_growths = row[1].value;
            debug("Fetch number log growths for database", database);
            metrics.mssql_log_growths.set({database}, mssql_log_growths);
        }
    }
};

const mssql_database_filesize = {
    metrics: {
        mssql_database_filesize: new client.Gauge({name: 'mssql_database_filesize', help: 'Physical sizes of files used by database in KB, their names and types (0=rows, 1=log, 2=filestream,3=n/a 4=fulltext(before v2008 of MSSQL))', labelNames: ['database','logicalname','type','filename']}),
    },
    query: `SELECT DB_NAME(database_id) AS database_name, name AS logical_name, type, physical_name, (size * CAST(8 AS BIGINT)) size_kb FROM sys.master_files`,
    collect: function (rows, metrics) {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const database = row[0].value;
			const logicalname = row[1].value
			const type = row[2].value
			const filename = row[3].value
			const mssql_database_filesize = row[4].value;
            debug("Fetch size of files for database ", database);
            metrics.mssql_database_filesize.set({database, logicalname, type, filename}, mssql_database_filesize);
        }
    }
};

const mssql_buffer_manager = {
    metrics: {
        mssql_page_read_total: new client.Gauge({name: 'mssql_page_read_total', help: 'Page reads/sec'}),
        mssql_page_write_total: new client.Gauge({name: 'mssql_page_write_total', help: 'Page writes/sec'}),
        mssql_page_life_expectancy: new client.Gauge({name: 'mssql_page_life_expectancy', help: 'Indicates the minimum number of seconds a page will stay in the buffer pool on this node without references. The traditional advice from Microsoft used to be that the PLE should remain above 300 seconds'})
    },
    query: `
        SELECT * FROM 
        (
            SELECT rtrim(counter_name) as counter_name, cntr_value
            FROM sys.dm_os_performance_counters
            WHERE counter_name in ('Page reads/sec', 'Page writes/sec', 'Page life expectancy')
            AND object_name = 'SQLServer:Buffer Manager'
        ) d
        PIVOT
        (
        MAX(cntr_value)
        FOR counter_name IN ([Page reads/sec], [Page writes/sec], [Page life expectancy])
        ) piv
    `,
    collect: function (rows, metrics) {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const page_read = row[0].value;
            const page_write = row[1].value;
            const page_life_expectancy = row[2].value;
            debug("Fetch the disk io", page_read, page_write, page_life_expectancy);
            metrics.mssql_page_read_total.set(page_read);
            metrics.mssql_page_write_total.set(page_write);
            metrics.mssql_page_life_expectancy.set(page_life_expectancy);
        }
    }
};

const mssql_io_stall = {
    metrics: {
        mssql_io_stall: new client.Gauge({name: 'mssql_io_stall', help: 'Wait time (ms) of stall since last restart', labelNames: ['database', 'type']}),
        mssql_io_stall_total: new client.Gauge({name: 'mssql_io_stall_total', help: 'Wait time (ms) of stall since last restart', labelNames: ['database']}),
    },
    query: `SELECT
cast(DB_Name(a.database_id) as varchar) as name,
    max(io_stall_read_ms),
    max(io_stall_write_ms),
    max(io_stall),
    max(io_stall_queued_read_ms),
    max(io_stall_queued_write_ms)
FROM
sys.dm_io_virtual_file_stats(null, null) a
INNER JOIN sys.master_files b ON a.database_id = b.database_id and a.file_id = b.file_id
GROUP BY a.database_id`,
    collect: function (rows, metrics) {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const database = row[0].value;
            const read = row[1].value;
            const write = row[2].value;
            const stall = row[3].value;
            const queued_read = row[4].value;
            const queued_write = row[5].value;
            debug("Fetch number of stalls for database", database);
            metrics.mssql_io_stall_total.set({database}, stall);
            metrics.mssql_io_stall.set({database, type: "read"}, read);
            metrics.mssql_io_stall.set({database, type: "write"}, write);
            metrics.mssql_io_stall.set({database, type: "queued_read"}, queued_read);
            metrics.mssql_io_stall.set({database, type: "queued_write"}, queued_write);
        }
    }
};

const mssql_batch_requests = {
    metrics: {
        mssql_batch_requests: new client.Gauge({name: 'mssql_batch_requests', help: 'Number of Transact-SQL command batches received per second. This statistic is affected by all constraints (such as I/O, number of users, cachesize, complexity of requests, and so on). High batch requests mean good throughput'})
    },
    query: `SELECT TOP 1 cntr_value
FROM sys.dm_os_performance_counters 
WHERE counter_name = 'Batch Requests/sec'`,
    collect: function (rows, metrics) {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const mssql_batch_requests = row[0].value;
            debug("Fetch number of batch requests per second", mssql_batch_requests);
            metrics.mssql_batch_requests.set(mssql_batch_requests);
        }
    }
};

const mssql_transactions = {
    metrics: {
        mssql_transactions: new client.Gauge({name: 'mssql_transactions_total', help: 'TPS.', labelNames: ['database']})
    },
    query: `SELECT rtrim(instance_name), cntr_value
FROM sys.dm_os_performance_counters
WHERE counter_name = 'Transactions/sec' AND instance_name <> '_Total'`,
    collect: function (rows, metrics) {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const database = row[0].value;
            const transactions = row[1].value;
            debug("Fetch number of transactions per second", database, transactions);
            metrics.mssql_transactions.set({database}, transactions);
        }
    }
};

const mssql_os_process_memory = {
    metrics: {
        mssql_page_fault_count: new client.Gauge({name: 'mssql_page_fault_count', help: 'Number of page faults since last restart'}),
        mssql_memory_utilization_percentage: new client.Gauge({name: 'mssql_memory_utilization_percentage', help: 'Percentage of memory utilization'}),
    },
    query: `SELECT page_fault_count, memory_utilization_percentage 
FROM sys.dm_os_process_memory`,
    collect: function (rows, metrics) {
        const page_fault_count = rows[0][0].value;
        const memory_utilization_percentage = rows[0][1].value;
        debug("Fetch page fault count", page_fault_count);
        metrics.mssql_page_fault_count.set(page_fault_count);
        metrics.mssql_memory_utilization_percentage.set(memory_utilization_percentage);
    }
};

const mssql_os_sys_memory = {
    metrics: {
        mssql_total_physical_memory_kb: new client.Gauge({name: 'mssql_total_physical_memory_kb', help: 'Total physical memory in KB'}),
        mssql_available_physical_memory_kb: new client.Gauge({name: 'mssql_available_physical_memory_kb', help: 'Available physical memory in KB'}),
        mssql_total_page_file_kb: new client.Gauge({name: 'mssql_total_page_file_kb', help: 'Total page file in KB'}),
        mssql_available_page_file_kb: new client.Gauge({name: 'mssql_available_page_file_kb', help: 'Available page file in KB'}),
    },
    query: `SELECT total_physical_memory_kb, available_physical_memory_kb, total_page_file_kb, available_page_file_kb 
FROM sys.dm_os_sys_memory`,
    collect: function (rows, metrics) {
        const mssql_total_physical_memory_kb = rows[0][0].value;
        const mssql_available_physical_memory_kb = rows[0][1].value;
        const mssql_total_page_file_kb = rows[0][2].value;
        const mssql_available_page_file_kb = rows[0][3].value;
        debug("Fetch system memory information");
        metrics.mssql_total_physical_memory_kb.set(mssql_total_physical_memory_kb);
        metrics.mssql_available_physical_memory_kb.set(mssql_available_physical_memory_kb);
        metrics.mssql_total_page_file_kb.set(mssql_total_page_file_kb);
        metrics.mssql_available_page_file_kb.set(mssql_available_page_file_kb);
    }
};


const metrics = [
    mssql_instance_local_time,
    mssql_connections,
    mssql_deadlocks,
    mssql_user_errors,
    mssql_kill_connection_errors,
    mssql_database_state,
    mssql_log_growths,
    mssql_database_filesize,
    mssql_buffer_manager,
    mssql_io_stall,
    mssql_batch_requests,
    mssql_transactions,
    mssql_os_process_memory,
    mssql_os_sys_memory
];

module.exports = {
    client: client,
    up: up,
    metrics: metrics,
};

// DOCUMENTATION of queries and their associated metrics (targeted to DBAs)
if (require.main === module) {
    metrics.forEach(function (m) {
        for(let key in m.metrics) {
            if(m.metrics.hasOwnProperty(key)) {
                console.log("--", m.metrics[key].name, m.metrics[key].help);
            }
        }
        console.log(m.query + ";");
        console.log("");
    });

    console.log("/*");
    metrics.forEach(function (m) {
        for (let key in m.metrics) {
            if(m.metrics.hasOwnProperty(key)) {
                console.log("* ", m.metrics[key].name + (m.metrics[key].labelNames.length > 0 ? ( "{" + m.metrics[key].labelNames + "}") : ""), m.metrics[key].help);
            }
        }
    });
    console.log("*/");
}