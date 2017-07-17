const inflect = require('pluralize');
const { EventEmitter } = require('events');

class Strategy extends EventEmitter {
  static guessColumnName(table, column) {
    table = inflect.singular(table.split('.').pop());
    table = (table[0].toLowerCase() + table.slice(1));
    column = column[0].toUpperCase() + column.slice(1);

    return table + column;
  }
  static guessTableName(localTable, remoteTable) {
    localTable = inflect.singular(localTable.split('.').pop());
    localTable = (localTable[0].toLowerCase() + localTable.slice(1));
    remoteTable = remoteTable[0].toUpperCase() + remoteTable.slice(1);

    return localTable + remoteTable;
  }
  static guessIdColumn() {
    return 'id';
  }
}

module.exports = Strategy;