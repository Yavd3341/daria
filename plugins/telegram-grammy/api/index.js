//
// Lair API - Telegram bot
// Illia Yavdoshchuk (c) 2023
//

const { Bot, InputFile } = require("grammy");
const { autoRetry } = require("@grammyjs/auto-retry")

const rgEscape = /([_*[\]()~`>#+\-=|{}.!])/g

var bot;

function makeBot(config) {
    bot = new Bot(config.key);
    bot.config = config;

    bot.normalizeChat = (name) => {
        let id = 0;
        if (typeof (name) == "number")
            id = name;
        else if (typeof (name) != "string" || ["me", "self"].includes(name))
            id = bot.default_chat;
        else if (name.startsWith("#"))
            return undefined;
        else if (name.startsWith("@"))
            id = name;
        else if (name in config.chats)
            id = config.chats[name];
        return id;
    }

    bot.default_chat = config.chats[config.default_chat];
    bot.update = () => {
        bot.config.load();
        bot.default_chat = config.chats[config.default_chat];
    }

    bot.save = () => {
        config.save();
    }

    bot.escape = (str) => str.replace(rgEscape, "\\$&");

    const mappings = {
        image: "sendPhoto",
        audio: "sendAudio",
        audio_short: "sendVoice",
        video: "sendVideo",
        file: "sendDocument"
    }

    bot.isKnownChat = (chat) => {
        for (const name in config.chats)
            if (!name.startsWith("#") && config.chats[name] == chat)
                return true;
        return false;
    }

    bot.richSend = (msg, chat) => {
        chat = bot.normalizeChat(chat)

        if (!chat)
            return;

        if (typeof (msg) == "string")
            bot.api.sendMessage(chat, msg);
        else {
            let text = msg.text;
            let options = msg.options;
            let payload = msg.payload;
            let attachment = msg.attachement;

            if (payload)
                for (const token in payload)
                    text = text.replaceAll(`{${token}}`, payload[token]);

            if (options)
                if (options.escape)
                    text = bot.escape(text)

            if (attachment) {
                let path = attachment.path || attachment.url;

                if (payload)
                    for (const token in payload)
                        path = path.replaceAll(`{${token}}`, payload[token]);

                if (!attachment.condition || payload && payload[attachment.condition]) {
                    let file = attachment.path ? new InputFile(path) : path;
                    options.caption = text;

                    let type = attachment.type.toLowerCase();
                    if (type in mappings) {
                        bot.api[mappings[type]](chat, file, options);
                        return;
                    }
                }
            }

            bot.api.sendMessage(chat, text, options);
        }
    }

    bot.api.config.use(autoRetry());
    
    bot.catch((err) => {
        const ctx = err.ctx;
        console.error(`Error while handling update ${ctx.update.update_id}:`);
        const e = err.error;
        if (e instanceof GrammyError)
            console.error("Error in request:", e.description);
        else if (e instanceof HttpError)
            console.error("Could not contact Telegram:", e);
        else
            console.error("Unknown error:", e);
    });

    bot.send = (msg, other, chat) => bot.api.sendMessage(bot.normalizeChat(chat), msg, other);
    bot.sendAudio = (path, other, chat) => bot.api.sendAudio(bot.normalizeChat(chat), new InputFile(path), other);

    return bot;
}

module.exports = {
  init(ctx) {
    const storageManager = ctx.pluginManager.getPlugin("storage-mgr");
    let storage = storageManager.getStorage("telegram", {
      key: undefined,
      default_chat: undefined
    });
    storage.load();

    if (storage["key"] && storage["default_chat"])
      bot = makeBot(storage);
    else {
      console.error("Telegram bot key or default chat is missing");
      storage.drop();
    }
  },

  sendNotification(message) {
    bot.send(message);
  },

  getBot() {
    return bot;
  }
};
