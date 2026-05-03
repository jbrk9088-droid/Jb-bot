const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys")

const P = require("pino")
const readline = require("readline")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const ask = (q) => new Promise(r => rl.question(q, r))

let antiLink = false
let autoReply = false

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" }))
    }
  })

  sock.ev.on("creds.update", saveCreds)

  // 🔐 Pair system
  if (!sock.authState.creds.registered) {
    const num = await ask("📱 Enter WhatsApp Number: ")
    const code = await sock.requestPairingCode(num)
    console.log("🔑 Pair Code:", code)
  }

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0]
    if (!msg.message) return

    const from = msg.key.remoteJid
    const isGroup = from.endsWith("@g.us")

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text || ""

    // ================= MENU =================
    if (text === ".menu") {

      const runtime = process.uptime()
      const hours = Math.floor(runtime / 3600)
      const minutes = Math.floor((runtime % 3600) / 60)
      const seconds = Math.floor(runtime % 60)

      const start = Date.now()

      const menu = `
╔════════◇◆◇═══════╗
├▢❤️‍🔥  JB BOT ❤️‍🔥
├▢👑 Owner: JB PAPA 71
├▢🕐 ${new Date().toLocaleString()}
├▢⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s
├▢📶 Ping: ${Date.now() - start} ms
├▢🔖 Version: 3.0
├▢🌐 WhatsApp MD
╚════════◇◆◇═══════╝

╔══════════════════╗
👬 GROUP MANAGER
╠──────────────────╣
║ .tagall  .kick  .promote
╚══════════════════╝

╔══════════════════╗
🛡️ SECURITY
╠──────────────────╣
║ .antilink on/off
╚══════════════════╝

╔══════════════════╗
⚙️ SETTINGS
╠──────────────────╣
║ .autoreply on/off
╚══════════════════╝

╔══════════════════╗
📥 DOWNLOADER
╠──────────────────╣
║ .song
╚══════════════════╝

╔══════════════════╗
🤖 AI
╠──────────────────╣
║ .ai
╚══════════════════╝

╔══════════════════╗
💻 BOT INFO
╠──────────────────╣
║ .ping  .alive
╚══════════════════╝
`

      await sock.sendMessage(from, {
        image: { url: "https://i.imgur.com/4Z7Dz1k.jpeg" },
        caption: menu
      })
    }

    // ================= BASIC COMMANDS =================

    if (text === ".ping") {
      await sock.sendMessage(from, { text: "🏓 Pong!" })
    }

    if (text === ".alive") {
      await sock.sendMessage(from, { text: "✅ Bot is Alive" })
    }

    // ================= GROUP =================

    if (text === ".tagall" && isGroup) {
      const meta = await sock.groupMetadata(from)
      const users = meta.participants.map(p => p.id)

      await sock.sendMessage(from, {
        text: "📢 Tagging all",
        mentions: users
      })
    }

    if (text.startsWith(".kick") && isGroup) {
      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
      if (mentioned) {
        await sock.groupParticipantsUpdate(from, mentioned, "remove")
      }
    }

    if (text.startsWith(".promote") && isGroup) {
      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
      if (mentioned) {
        await sock.groupParticipantsUpdate(from, mentioned, "promote")
      }
    }

    // ================= SECURITY =================

    if (text === ".antilink on") {
      antiLink = true
      await sock.sendMessage(from, { text: "🚫 AntiLink ON" })
    }

    if (text === ".antilink off") {
      antiLink = false
      await sock.sendMessage(from, { text: "❌ AntiLink OFF" })
    }

    if (antiLink && text.includes("chat.whatsapp.com")) {
      await sock.sendMessage(from, { text: "🚫 Link not allowed!" })
    }

    // ================= AUTO REPLY =================

    if (text === ".autoreply on") {
      autoReply = true
      await sock.sendMessage(from, { text: "🤖 Auto Reply ON" })
    }

    if (text === ".autoreply off") {
      autoReply = false
      await sock.sendMessage(from, { text: "❌ Auto Reply OFF" })
    }

    if (autoReply && text && !text.startsWith(".")) {
      await sock.sendMessage(from, { text: "🤖 Auto Reply Active" })
    }

    // ================= SONG =================

    if (text.startsWith(".song")) {
      const q = text.replace(".song", "")
      await sock.sendMessage(from, {
        text: "🎵 Searching: " + q + "\n(API needed)"
      })
    }

    // ================= AI =================

    if (text.startsWith(".ai")) {
      const q = text.replace(".ai", "")
      await sock.sendMessage(from, {
        text: "🤖 AI: " + q
      })
    }

  })
}

startBot()
