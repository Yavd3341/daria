//
// Placeholder plugin
//

module.exports = {
  init(ctx) {
    const uiManager = ctx.pluginManager.getPlugin("ui");

    uiManager.addCardsBuilder(ctx => {
      return {
        styles: [ "/plugins/placeholder/styles.css" ],
        templates: {
          "placeholder": "placeholder/html/placeholder.html",
          "placeholder-big": "placeholder/html/placeholder-big.html"
        }
      }
    });
  }
}