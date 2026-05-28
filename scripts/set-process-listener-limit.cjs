const MIN_PROCESS_MAX_LISTENERS = 50

if (process.getMaxListeners() < MIN_PROCESS_MAX_LISTENERS) {
  process.setMaxListeners(MIN_PROCESS_MAX_LISTENERS)
}
