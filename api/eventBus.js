//
// Daria: Event bus
// Illia Yavdoshchuk @ 2023
//

var LISTENERS = []

module.exports = {
  async fire(eventName, eventArgs) {
    console.debug(`Firing event "${eventName}" with args "${eventArgs}"`);

    let cleanupPending = false;

    for (const listener of LISTENERS) {
      if (listener && typeof(listener) == "function")
        listener(eventName, eventArgs);
      else if (cleanupPending)
        console.warn("Empty listener found, pending clean-up...");
      else {
        cleanupPending = true;
        console.warn("Empty listener found");
      }
    }

    if (cleanupPending) {
      console.info("Listeners list contains invalid items, cleaning up...");
      LISTENERS = LISTENERS.filter(listener => listener && typeof(listener) == "function");
    }
  },

  registerListener(listener) {
    if (!LISTENERS.includes(listener))
      LISTENERS.push(listener); 
  },

  unregisterListener(listener) {
    const index = LISTENERS.indexOf(listener);
    if (index != -1)
      LISTENERS.splice(index, 1);
  }
}