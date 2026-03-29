/**
 * logger.js — Winston structured logger
 * Fix R11: Replaces ad-hoc console.log with structured, leveled logging.
 * - In production: JSON format (machine-readable for log aggregators)
 * - In development: Colorized human-readable format
 */
const { createLogger, format, transports } = require('winston')

const isProd = process.env.NODE_ENV === 'production'

const logger = createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd
    ? format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      )
    : format.combine(
        format.colorize(),
        format.timestamp({ format: 'HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ level, message, timestamp, ...meta }) => {
          const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
          return `${timestamp} [${level}] ${message}${extra}`
        })
      ),
  transports: [new transports.Console()],
})

module.exports = logger
