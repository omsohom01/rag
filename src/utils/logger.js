"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var Logger = /** @class */ (function () {
    function Logger() {
    }
    Logger.prototype.formatMessage = function (level, message, meta) {
        var timestamp = new Date().toISOString();
        var metaStr = meta ? " ".concat(JSON.stringify(meta)) : '';
        return "[".concat(timestamp, "] [").concat(level.toUpperCase(), "] ").concat(message).concat(metaStr);
    };
    Logger.prototype.info = function (message, meta) {
        console.log(this.formatMessage('info', message, meta));
    };
    Logger.prototype.warn = function (message, meta) {
        console.warn(this.formatMessage('warn', message, meta));
    };
    Logger.prototype.error = function (message, error) {
        var errorMeta = error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error;
        console.error(this.formatMessage('error', message, errorMeta));
    };
    Logger.prototype.debug = function (message, meta) {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(this.formatMessage('debug', message, meta));
        }
    };
    return Logger;
}());
exports.logger = new Logger();
