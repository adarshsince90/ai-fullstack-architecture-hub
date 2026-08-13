-- =========================================================================
-- SQL Server Diagnostic Toolkit for Lead Engineers & Database Tuning
-- =========================================================================

-- 1. Identify Top 10 High-Impact Missing Indexes (Calculates Estimated Improvement)
SELECT TOP 10
    ROUND(s.avg_total_user_cost * s.avg_user_impact * (s.user_seeks + s.user_scans), 0) AS ImpactScore,
    d.statement AS TableName,
    'CREATE NONCLUSTERED INDEX IX_' + OBJECT_NAME(d.object_id) + '_' + 
    REPLACE(REPLACE(REPLACE(ISNULL(d.equality_columns, ''), ', ', '_'), '[', ''), ']', '') +
    CASE WHEN d.inequality_columns IS NOT NULL THEN '_' + REPLACE(REPLACE(REPLACE(d.inequality_columns, ', ', '_'), '[', ''), ']', '') ELSE '' END +
    ' ON ' + d.statement + ' (' + ISNULL(d.equality_columns, '') + 
    CASE WHEN d.equality_columns IS NOT NULL AND d.inequality_columns IS NOT NULL THEN ', ' ELSE '' END + 
    ISNULL(d.inequality_columns, '') + ')' +
    ISNULL(' INCLUDE (' + d.included_columns + ')', '') AS RecommendedCreateIndexStatement,
    s.user_seeks,
    s.user_scans,
    s.avg_user_impact AS PercentageBenefit
FROM sys.dm_db_missing_index_group_stats s
JOIN sys.dm_db_missing_index_groups g ON s.group_handle = g.index_group_handle
JOIN sys.dm_db_missing_index_details d ON g.index_handle = d.index_handle
ORDER BY ImpactScore DESC;

-- 2. Find Queries with Expensive Full Clustered Index Scans or Key Lookups
SELECT TOP 15
    qs.total_worker_time / qs.execution_count AS AvgCpuTime_Microsec,
    qs.total_logical_reads / qs.execution_count AS AvgLogicalReads,
    qs.execution_count,
    SUBSTRING(st.text, (qs.statement_start_offset/2)+1,
        ((CASE qs.statement_end_offset WHEN -1 THEN DATALENGTH(st.text)
          ELSE qs.statement_end_offset END - qs.statement_start_offset)/2) + 1) AS QueryText,
    qp.query_plan
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
CROSS APPLY sys.dm_exec_query_plan(qs.plan_handle) qp
ORDER BY AvgLogicalReads DESC;

-- 3. Unused / Redundant Indexes (Consuming Disk & Slowing Down INSERT/UPDATEs)
SELECT 
    OBJECT_NAME(i.object_id) AS TableName,
    i.name AS IndexName,
    s.user_seeks,
    s.user_scans,
    s.user_lookups,
    s.user_updates AS WriteCost
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats s 
    ON i.object_id = s.object_id AND i.index_id = s.index_id AND s.database_id = DB_ID()
WHERE OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
  AND i.index_id > 1 -- Exclude Clustered Primary Keys
  AND (s.user_seeks + s.user_scans + s.user_lookups) = 0
ORDER BY s.user_updates DESC;
