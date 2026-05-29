/**
 * @typedef {Object} FieldMeta
 * @property {string} name
 * @property {string} type       - normalised: 'varchar', 'int', 'text', 'enum', 'date', etc.
 * @property {number|null} length
 * @property {boolean} nullable
 * @property {string|null} defaultValue
 * @property {string[]} values   - populated for enum fields, otherwise []
 * @property {boolean} autoIncrement
 */

/**
 * @typedef {Object} DbAdapter
 * @property {(sql: string, params?: any[]) => Promise<Record<string,any>[]>} select
 * @property {(sql: string, params?: any[]) => Promise<number>} execute
 * @property {(table: string, data: Record<string,any>) => Promise<number|string>} insert
 * @property {(tableName: string) => Promise<FieldMeta[]>} describeTable
 * @property {() => Promise<void>} close
 */
