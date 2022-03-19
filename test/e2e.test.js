const request = require('superagent');

function parse(text) {
    let lines = text.split('\n');
    lines = lines.filter(line => !line.startsWith("#")).filter(line => line.length !== 0);
    const o = {};
    lines.forEach(line => {
        expect(line.indexOf(' ')).toBeGreaterThanOrEqual(0);
        [key, value] = line.split(" ");
        o[key]= parseInt(value);
    });
    return o;
}

describe('E2E Test', function () {
    it('Fetch all metrics and ensure that all expected are present', async function () {
        const data = await request.get('http://localhost:4000/metrics');
        expect(data.status).toBe(200);
        let text = data.text;
        const lines = parse(text);
        
        // some specific tests
        expect(lines.up).toBe(1);
        expect(lines.mssql_instance_local_time).toBeGreaterThan(0);
        expect(lines.mssql_total_physical_memory_kb).toBeGreaterThan(0);
        
        // lets remove specific 2019 entries so we have a simple expect to execute
        // we are going to assume that if all else is here then it is working
        // once we have a version summary metric, we might be able to split this test into multiple ones  
        delete lines["mssql_database_filesize{database=\"tempdb\",logicalname=\"tempdev2\",type=\"0\",filename=\"/var/opt/mssql/data/tempdb2.ndf\"}"];
        delete lines["mssql_database_filesize{database=\"tempdb\",logicalname=\"tempdev3\",type=\"0\",filename=\"/var/opt/mssql/data/tempdb3.ndf\"}"];
        delete lines["mssql_database_filesize{database=\"tempdb\",logicalname=\"tempdev4\",type=\"0\",filename=\"/var/opt/mssql/data/tempdb4.ndf\"}"];

        // bulk ensure that all expected results of a vanilla mssql server instance are here
        expect(Object.keys(lines)).toEqual([
            "up",
            "mssql_instance_local_time",
            "mssql_connections{database=\"master\",state=\"current\"}",
            "mssql_connections{database=\"null\",state=\"current\"}",
            "mssql_deadlocks",
            "mssql_user_errors",
            "mssql_kill_connection_errors",
            "mssql_database_state{database=\"master\"}",
            "mssql_database_state{database=\"tempdb\"}",
            "mssql_database_state{database=\"model\"}",
            "mssql_database_state{database=\"msdb\"}",
            "mssql_log_growths{database=\"tempdb\"}",
            "mssql_log_growths{database=\"model\"}",
            "mssql_log_growths{database=\"msdb\"}",
            "mssql_log_growths{database=\"mssqlsystemresource\"}",
            "mssql_log_growths{database=\"master\"}",
            "mssql_database_filesize{database=\"master\",logicalname=\"master\",type=\"0\",filename=\"/var/opt/mssql/data/master.mdf\"}",
            "mssql_database_filesize{database=\"master\",logicalname=\"mastlog\",type=\"1\",filename=\"/var/opt/mssql/data/mastlog.ldf\"}",
            "mssql_database_filesize{database=\"tempdb\",logicalname=\"tempdev\",type=\"0\",filename=\"/var/opt/mssql/data/tempdb.mdf\"}",
            "mssql_database_filesize{database=\"tempdb\",logicalname=\"templog\",type=\"1\",filename=\"/var/opt/mssql/data/templog.ldf\"}",
            "mssql_database_filesize{database=\"model\",logicalname=\"modeldev\",type=\"0\",filename=\"/var/opt/mssql/data/model.mdf\"}",
            "mssql_database_filesize{database=\"model\",logicalname=\"modellog\",type=\"1\",filename=\"/var/opt/mssql/data/modellog.ldf\"}",
            "mssql_database_filesize{database=\"msdb\",logicalname=\"MSDBData\",type=\"0\",filename=\"/var/opt/mssql/data/MSDBData.mdf\"}",
            "mssql_database_filesize{database=\"msdb\",logicalname=\"MSDBLog\",type=\"1\",filename=\"/var/opt/mssql/data/MSDBLog.ldf\"}",
            "mssql_page_life_expectancy",
            "mssql_io_stall{database=\"master\",type=\"read\"}",
            "mssql_io_stall{database=\"master\",type=\"write\"}",
            "mssql_io_stall{database=\"master\",type=\"queued_read\"}",
            "mssql_io_stall{database=\"master\",type=\"queued_write\"}",
            "mssql_io_stall{database=\"tempdb\",type=\"read\"}",
            "mssql_io_stall{database=\"tempdb\",type=\"write\"}",
            "mssql_io_stall{database=\"tempdb\",type=\"queued_read\"}",
            "mssql_io_stall{database=\"tempdb\",type=\"queued_write\"}",
            "mssql_io_stall{database=\"model\",type=\"read\"}",
            "mssql_io_stall{database=\"model\",type=\"write\"}",
            "mssql_io_stall{database=\"model\",type=\"queued_read\"}",
            "mssql_io_stall{database=\"model\",type=\"queued_write\"}",
            "mssql_io_stall{database=\"msdb\",type=\"read\"}",
            "mssql_io_stall{database=\"msdb\",type=\"write\"}",
            "mssql_io_stall{database=\"msdb\",type=\"queued_read\"}",
            "mssql_io_stall{database=\"msdb\",type=\"queued_write\"}",
            "mssql_io_stall_total{database=\"master\"}",
            "mssql_io_stall_total{database=\"tempdb\"}",
            "mssql_io_stall_total{database=\"model\"}",
            "mssql_io_stall_total{database=\"msdb\"}",
            "mssql_batch_requests",
            "mssql_page_fault_count",
            "mssql_memory_utilization_percentage",
            "mssql_total_physical_memory_kb",
            "mssql_available_physical_memory_kb",
            "mssql_total_page_file_kb",
            "mssql_available_page_file_kb"
        ]);
    });
});