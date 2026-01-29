import { format, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import { formatDistanceToNow, parseISO } from 'date-fns'

// Timezone constants per Technical Clarifications Section 3.5
const UTC_TIMEZONE = 'UTC'
const DISPLAY_TIMEZONE = process.env.DISPLAY_TIMEZONE || 'America/New_York'

/**
 * Convert UTC timestamp to Eastern Time for display
 * @param {Date|string} utcDate - UTC date/time
 * @param {string} formatStr - date-fns format string
 * @returns {string} Formatted date in ET
 */
export const toEasternTime = (utcDate, formatStr = 'MMM dd, yyyy HH:mm zzz') => {
  const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate
  const etDate = utcToZonedTime(date, DISPLAY_TIMEZONE)
  return format(etDate, formatStr, { timeZone: DISPLAY_TIMEZONE })
}

/**
 * Convert Eastern Time to UTC for database storage
 * @param {Date|string} etDate - Date in Eastern Time
 * @returns {Date} UTC date
 */
export const toUTC = (etDate) => {
  const date = typeof etDate === 'string' ? parseISO(etDate) : etDate
  return zonedTimeToUtc(date, DISPLAY_TIMEZONE)
}

/**
 * Get current time in UTC (for database insertion)
 * @returns {Date} Current time in UTC
 */
export const nowUTC = () => {
  return new Date()
}

/**
 * Get current time in Eastern Time (for display)
 * @returns {Date} Current time in ET
 */
export const nowET = () => {
  return utcToZonedTime(new Date(), DISPLAY_TIMEZONE)
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param {Date|string} date - Date to compare
 * @returns {string} Relative time string
 */
export const relativeTime = (date) => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(parsedDate, { addSuffix: true })
}

/**
 * Calculate trade window status and countdown
 * Per Technical Clarifications Section 1.2:
 * - Trading window CLOSED: 11:59 PM ET night before first game
 * - Trading window OPENS: 12:01 AM ET morning after last game
 * 
 * @param {Date} firstGameTime - First game of the week (UTC)
 * @param {Date} lastGameTime - Last game of the week (UTC)
 * @returns {Object} { isOpen: boolean, opensAt: Date|null, closesAt: Date|null, countdown: string }
 */
export const getTradeWindowStatus = (firstGameTime, lastGameTime) => {
  const now = nowET()
  
  // Convert game times to ET
  const firstGameET = utcToZonedTime(firstGameTime, DISPLAY_TIMEZONE)
  const lastGameET = utcToZonedTime(lastGameTime, DISPLAY_TIMEZONE)
  
  // Calculate window close time: 11:59 PM ET the night before first game
  const closesAt = new Date(firstGameET)
  closesAt.setDate(closesAt.getDate() - 1) // Day before
  closesAt.setHours(23, 59, 59, 999) // 11:59 PM
  
  // Calculate window open time: 12:01 AM ET the morning after last game
  const opensAt = new Date(lastGameET)
  opensAt.setDate(opensAt.getDate() + 1) // Day after
  opensAt.setHours(0, 1, 0, 0) // 12:01 AM
  
  // Determine if window is currently open
  const isOpen = now >= opensAt || now < closesAt
  
  // Calculate countdown
  let countdown = ''
  if (isOpen && now < closesAt) {
    countdown = `Trading closes ${relativeTime(closesAt)}`
  } else if (!isOpen) {
    countdown = `Trading opens ${relativeTime(opensAt)}`
  } else {
    countdown = 'Trading is open'
  }
  
  return {
    isOpen,
    opensAt: toUTC(opensAt), // Return as UTC for consistency
    closesAt: toUTC(closesAt), // Return as UTC for consistency
    countdown
  }
}

/**
 * Check if a draft should start (after check-in period)
 * @param {Date} scheduledTime - Scheduled draft start time (UTC)
 * @param {number} checkInMinutes - Check-in duration in minutes (default: 10)
 * @returns {boolean} True if draft should start
 */
export const shouldDraftStart = (scheduledTime, checkInMinutes = 10) => {
  const now = nowUTC()
  const checkInEnd = new Date(scheduledTime)
  checkInEnd.setMinutes(checkInEnd.getMinutes() + checkInMinutes)
  
  return now >= checkInEnd
}

/**
 * Format timestamp for database insertion
 * @param {Date} date - Date to format
 * @returns {string} ISO 8601 string in UTC
 */
export const toDBTimestamp = (date = new Date()) => {
  return date.toISOString()
}

export default {
  toEasternTime,
  toUTC,
  nowUTC,
  nowET,
  relativeTime,
  getTradeWindowStatus,
  shouldDraftStart,
  toDBTimestamp,
  DISPLAY_TIMEZONE,
  UTC_TIMEZONE
}
