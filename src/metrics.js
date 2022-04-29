/**
 * Collection of metrics and their associated SQL requests
 * Created by Pierre Awaragi
 */
const metricsLog = require("debug")("metrics");
const client = require("prom-client");
const { productVersionParse } = require("./utils");

const mssql_up = {
  metrics: {
    mssql_up: new client.Gauge({ name: "mssql_up", help: "UP Status" }),
  },
  query: "SELECT 1",
  collect: (rows, metrics) => {
    let mssql_up = rows[0][0].value;
    metricsLog("Fetched status of instance", mssql_up);
    metrics.mssql_up.set(mssql_up);
  },
};

const mssql_product_version = {
  metrics: {
    mssql_product_version: new client.Gauge({ name: "mssql_product_version", help: "Instance version (Major.Minor)" }),
  },
  query: `SELECT CONVERT(VARCHAR(128), SERVERPROPERTY ('productversion')) AS ProductVersion,
  SERVERPROPERTY('ProductVersion') AS ProductVersion
`,
  collect: (rows, metrics) => {
    let v = productVersionParse(rows[0][0].value);
    const mssql_product_version = v.major + "." + v.minor;
    metricsLog("Fetched version of instance", mssql_product_version);
    metrics.mssql_product_version.set(mssql_product_version);
  },
};

const mssql_instance_local_time = {
  metrics: {
    mssql_instance_local_time: new client.Gauge({ name: "mssql_instance_local_time", help: "Number of seconds since epoch on local instance" }),
  },
  query: `SELECT DATEDIFF(second, '19700101', GETUTCDATE())`,
  collect: (rows, metrics) => {
    const mssql_instance_local_time = rows[0][0].value;
    metricsLog("Fetched current time", mssql_instance_local_time);
    metrics.mssql_instance_local_time.set(mssql_instance_local_time);
  },
};

const mssql_connections = {
  metrics: {
    mssql_connections: new client.Gauge({ name: "mssql_connections", help: "Number of active connections", labelNames: ["database", "state"] }),
  },
  query: `SELECT DB_NAME(sP.dbid)
        , COUNT(sP.spid)
FROM sys.sysprocesses sP
GROUP BY DB_NAME(sP.dbid)`,
  collect: (rows, metrics) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const database = row[0].value;
      const mssql_connections = row[1].value;
      metricsLog("Fetched number of connections for database", database, mssql_connections);
      metrics.mssql_connections.set({ database, state: "current" }, mssql_connections);
    }
  },
};

const mssql_client_connections = {
  metrics: {
    mssql_client_connections: new client.Gauge({
      name: "mssql_client_connections",
      help: "Number of active client connections",
      labelNames: ["client", "database"],
    }),
  },
  query: `SELECT host_name, DB_NAME(dbid) dbname, COUNT(*) session_count
FROM sys.dm_exec_sessions a
LEFT JOIN sysprocesses b on a.session_id=b.spid
WHERE is_user_process=1
GROUP BY host_name, dbid`,
  collect: (rows, metrics) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const client = row[0].value;
      const database = row[1].value;
      const mssql_client_connections = row[2].value;
      metricsLog("Fetched number of connections for client", client, database, mssql_client_connections);
      metrics.mssql_client_connections.set({ client, database }, mssql_client_connections);
    }
  },
};

const mssql_deadlocks = {
  metrics: {
    mssql_deadlocks_per_second: new client.Gauge({
      name: "mssql_deadlocks",
      help: "Number of lock requests per second that resulted in a deadlock since last restart",
    }),
  },
  query: `SELECT cntr_value
FROM sys.dm_os_performance_counters
WHERE counter_name = 'Number of Deadlocks/sec' AND instance_name = '_Total'`,
  collect: (rows, metrics) => {
    const mssql_deadlocks = rows[0][0].value;
    metricsLog("Fetched number of deadlocks/sec", mssql_deadlocks);
    metrics.mssql_deadlocks_per_second.set(mssql_deadlocks);
  },
};

const mssql_user_errors = {
  metrics: {
    mssql_user_errors: new client.Gauge({ name: "mssql_user_errors", help: "Number of user errors/sec since last restart" }),
  },
  query: `SELECT cntr_value
FROM sys.dm_os_performance_counters
WHERE counter_name = 'Errors/sec' AND instance_name = 'User Errors'`,
  collect: (rows, metrics) => {
    const mssql_user_errors = rows[0][0].value;
    metricsLog("Fetched number of user errors/sec", mssql_user_errors);
    metrics.mssql_user_errors.set(mssql_user_errors);
  },
};

const mssql_kill_connection_errors = {
  metrics: {
    mssql_kill_connection_errors: new client.Gauge({ name: "mssql_kill_connection_errors", help: "Number of kill connection errors/sec since last restart" }),
  },
  query: `SELECT cntr_value
FROM sys.dm_os_performance_counters
WHERE counter_name = 'Errors/sec' AND instance_name = 'Kill Connection Errors'`,
  collect: (rows, metrics) => {
    const mssql_kill_connection_errors = rows[0][0].value;
    metricsLog("Fetched number of kill connection errors/sec", mssql_kill_connection_errors);
    metrics.mssql_kill_connection_errors.set(mssql_kill_connection_errors);
  },
};

const mssql_database_state = {
  metrics: {
    mssql_database_state: new client.Gauge({
      name: "mssql_database_state",
      help: "Databases states: 0=ONLINE 1=RESTORING 2=RECOVERING 3=RECOVERY_PENDING 4=SUSPECT 5=EMERGENCY 6=OFFLINE 7=COPYING 10=OFFLINE_SECONDARY",
      labelNames: ["database"],
    }),
  },
  query: `SELECT name,state FROM master.sys.databases`,
  collect: (rows, metrics) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const database = row[0].value;
      const mssql_database_state = row[1].value;
      metricsLog("Fetched state for database", database, mssql_database_state);
      metrics.mssql_database_state.set({ database }, mssql_database_state);
    }
  },
};

const mssql_log_growths = {
  metrics: {
    mssql_log_growths: new client.Gauge({
      name: "mssql_log_growths",
      help: "Total number of times the transaction log for the database has been expanded last restart",
      labelNames: ["database"],
    }),
  },
  query: `SELECT rtrim(instance_name), cntr_value
FROM sys.dm_os_performance_counters 
WHERE counter_name = 'Log Growths' and instance_name <> '_Total'`,
  collect: (rows, metrics) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const database = row[0].value;
      const mssql_log_growths = row[1].value;
      metricsLog("Fetched number log growths for database", database, mssql_log_growths);
      metrics.mssql_log_growths.set({ database }, mssql_log_growths);
    }
  },
};

const mssql_database_filesize = {
  metrics: {
    mssql_database_filesize: new client.Gauge({
      name: "mssql_database_filesize",
      help: "Physical sizes of files used by database in KB, their names and types (0=rows, 1=log, 2=filestream,3=n/a 4=fulltext(before v2008 of MSSQL))",
      labelNames: ["database", "logicalname", "type", "filename"],
    }),
  },
  query: `SELECT DB_NAME(database_id) AS database_name, name AS logical_name, type, physical_name, (size * CAST(8 AS BIGINT)) size_kb FROM sys.master_files`,
  collect: (rows, metrics) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const database = row[0].value;
      const logicalname = row[1].value;
      const type = row[2].value;
      const filename = row[3].value;
      const mssql_database_filesize = row[4].value;
      metricsLog(
        "Fetched size of files for database ",
        database,
        "logicalname",
        logicalname,
        "type",
        type,
        "filename",
        filename,
        "size",
        mssql_database_filesize
      );
      metrics.mssql_database_filesize.set({ database, logicalname, type, filename }, mssql_database_filesize);
    }
  },
};

const mssql_buffer_manager = {
  metrics: {
    mssql_page_read_total: new client.Gauge({ name: "mssql_page_read_total", help: "Page reads/sec" }),
    mssql_page_write_total: new client.Gauge({ name: "mssql_page_write_total", help: "Page writes/sec" }),
    mssql_page_life_expectancy: new client.Gauge({
      name: "mssql_page_life_expectancy",
      help: "Indicates the minimum number of seconds a page will stay in the buffer pool on this node without references. The traditional advice from Microsoft used to be that the PLE should remain above 300 seconds",
    }),
    mssql_lazy_write_total: new client.Gauge({ name: "mssql_lazy_write_total", help: "Lazy writes/sec" }),
    mssql_page_checkpoint_total: new client.Gauge({ name: "mssql_page_checkpoint_total", help: "Checkpoint pages/sec" }),
  },
  query: `SELECT * FROM 
        (
            SELECT rtrim(counter_name) as counter_name, cntr_value
            FROM sys.dm_os_performance_counters
            WHERE counter_name in ('Page reads/sec', 'Page writes/sec', 'Page life expectancy', 'Lazy writes/sec', 'Checkpoint pages/sec')
            AND object_name = 'SQLServer:Buffer Manager'
        ) d
        PIVOT
        (
        MAX(cntr_value)
        FOR counter_name IN ([Page reads/sec], [Page writes/sec], [Page life expectancy], [Lazy writes/sec], [Checkpoint pages/sec])
        ) piv
    `,
  collect: (rows, metrics) => {
    const row = rows[0];
    const page_read = row[0].value;
    const page_write = row[1].value;
    const page_life_expectancy = row[2].value;
    const lazy_write_total = row[3].value;
    const page_checkpoint_total = row[4].value;
    metricsLog(
      "Fetched the Buffer Manager",
      "page_read",
      page_read,
      "page_write",
      page_write,
      "page_life_expectancy",
      page_life_expectancy,
      "page_checkpoint_total",
      "page_checkpoint_total",
      page_checkpoint_total,
      "lazy_write_total",
      lazy_write_total
    );
    metrics.mssql_page_read_total.set(page_read);
    metrics.mssql_page_write_total.set(page_write);
    metrics.mssql_page_life_expectancy.set(page_life_expectancy);
    metrics.mssql_page_checkpoint_total.set(page_checkpoint_total);
    metrics.mssql_lazy_write_total.set(lazy_write_total);
  },
};

const mssql_io_stall = {
  metrics: {
    mssql_io_stall: new client.Gauge({ name: "mssql_io_stall", help: "Wait time (ms) of stall since last restart", labelNames: ["database", "type"] }),
    mssql_io_stall_total: new client.Gauge({ name: "mssql_io_stall_total", help: "Wait time (ms) of stall since last restart", labelNames: ["database"] }),
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
  collect: (rows, metrics) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const database = row[0].value;
      const read = row[1].value;
      const write = row[2].value;
      const stall = row[3].value;
      const queued_read = row[4].value;
      const queued_write = row[5].value;
      metricsLog("Fetched number of stalls for database", database, "read", read, "write", write, "queued_read", queued_read, "queued_write", queued_write);
      metrics.mssql_io_stall_total.set({ database }, stall);
      metrics.mssql_io_stall.set({ database, type: "read" }, read);
      metrics.mssql_io_stall.set({ database, type: "write" }, write);
      metrics.mssql_io_stall.set({ database, type: "queued_read" }, queued_read);
      metrics.mssql_io_stall.set({ database, type: "queued_write" }, queued_write);
    }
  },
};

const mssql_batch_requests = {
  metrics: {
    mssql_batch_requests: new client.Gauge({
      name: "mssql_batch_requests",
      help: "Number of Transact-SQL command batches received per second. This statistic is affected by all constraints (such as I/O, number of users, cachesize, complexity of requests, and so on). High batch requests mean good throughput",
    }),
  },
  query: `SELECT TOP 1 cntr_value
FROM sys.dm_os_performance_counters 
WHERE counter_name = 'Batch Requests/sec'`,
  collect: (rows, metrics) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const mssql_batch_requests = row[0].value;
      metricsLog("Fetched number of batch requests per second", mssql_batch_requests);
      metrics.mssql_batch_requests.set(mssql_batch_requests);
    }
  },
};

const mssql_transactions = {
  metrics: {
    mssql_transactions: new client.Gauge({
      name: "mssql_transactions",
      help: "Number of transactions started for the database per second. Transactions/sec does not count XTP-only transactions (transactions started by a natively compiled stored procedure.)",
      labelNames: ["database"],
    }),
  },
  query: `SELECT rtrim(instance_name), cntr_value
FROM sys.dm_os_performance_counters
WHERE counter_name = 'Transactions/sec' AND instance_name <> '_Total'`,
  collect: (rows, metrics) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const database = row[0].value;
      const transactions = row[1].value;
      metricsLog("Fetched number of transactions per second", database, transactions);
      metrics.mssql_transactions.set({ database }, transactions);
    }
  },
};

const mssql_os_process_memory = {
  metrics: {
    mssql_page_fault_count: new client.Gauge({ name: "mssql_page_fault_count", help: "Number of page faults since last restart" }),
    mssql_memory_utilization_percentage: new client.Gauge({ name: "mssql_memory_utilization_percentage", help: "Percentage of memory utilization" }),
  },
  query: `SELECT page_fault_count, memory_utilization_percentage 
FROM sys.dm_os_process_memory`,
  collect: (rows, metrics) => {
    const page_fault_count = rows[0][0].value;
    const memory_utilization_percentage = rows[0][1].value;
    metricsLog("Fetched page fault count", page_fault_count);
    metrics.mssql_page_fault_count.set(page_fault_count);
    metrics.mssql_memory_utilization_percentage.set(memory_utilization_percentage);
  },
};

const mssql_os_sys_memory = {
  metrics: {
    mssql_total_physical_memory_kb: new client.Gauge({ name: "mssql_total_physical_memory_kb", help: "Total physical memory in KB" }),
    mssql_available_physical_memory_kb: new client.Gauge({ name: "mssql_available_physical_memory_kb", help: "Available physical memory in KB" }),
    mssql_total_page_file_kb: new client.Gauge({ name: "mssql_total_page_file_kb", help: "Total page file in KB" }),
    mssql_available_page_file_kb: new client.Gauge({ name: "mssql_available_page_file_kb", help: "Available page file in KB" }),
  },
  query: `SELECT total_physical_memory_kb, available_physical_memory_kb, total_page_file_kb, available_page_file_kb 
FROM sys.dm_os_sys_memory`,
  collect: (rows, metrics) => {
    const mssql_total_physical_memory_kb = rows[0][0].value;
    const mssql_available_physical_memory_kb = rows[0][1].value;
    const mssql_total_page_file_kb = rows[0][2].value;
    const mssql_available_page_file_kb = rows[0][3].value;
    metricsLog(
      "Fetched system memory information",
      "Total physical memory",
      mssql_total_physical_memory_kb,
      "Available physical memory",
      mssql_available_physical_memory_kb,
      "Total page file",
      mssql_total_page_file_kb,
      "Available page file",
      mssql_available_page_file_kb
    );
    metrics.mssql_total_physical_memory_kb.set(mssql_total_physical_memory_kb);
    metrics.mssql_available_physical_memory_kb.set(mssql_available_physical_memory_kb);
    metrics.mssql_total_page_file_kb.set(mssql_total_page_file_kb);
    metrics.mssql_available_page_file_kb.set(mssql_available_page_file_kb);
  },
};

const entries = {
  mssql_up,
  mssql_product_version,
  mssql_instance_local_time,
  mssql_connections,
  mssql_client_connections,
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
  mssql_os_sys_memory,
};

module.exports = {
  entries,
};
