import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import express from "express";
import { LRUCache } from "lru-cache";
import { Agent } from "https";
import * as fs from "fs";
import path from "path";
import PQueue from "p-queue";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, increment } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_HOST = process.env.APP_URL; // Use AI Studio APP_URL
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || "https://t.me/Xorazm_ish_bozor1";
const ADMIN_ID = process.env.ADMIN_ID ? Number(process.env.ADMIN_ID) : undefined;
const PORT = 3000; // AI Studio requires port 3000

const subCache = new LRUCache<number, boolean>({ max: 10000, ttl: 1000 * 60 * 60 * 12 }); // 12 hours cache for subscribed users
const messageQueue = new PQueue({ concurrency: 100 }); // Process up to 100 messages concurrently

if (!BOT_TOKEN) {
  console.error("Missing required environment variable: BOT_TOKEN.\nPlease configure it in the AI Studio Secrets panel.");
}

// Enable KeepAlive for blazingly fast Telegram API requests by reusing TLS connections
const httpsAgent = new Agent({ keepAlive: true, maxSockets: 200, keepAliveMsecs: 30000 });
const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN, {
  telegram: { agent: httpsAgent }
}) : null;
const app = express();

const settingsCache = new Map<string, string>();

// Fast synchronous setting getter from memory
function getSettingSync(key: string, fallback: string = ""): string {
  return settingsCache.get(key) ?? fallback;
}

// ================= DATABASE =================
async function initDb() {
  try {
    // Pre-load all settings into memory cache
    const settingsSnap = await getDocs(collection(db, 'settings')).catch(() => null);
    if (settingsSnap) {
      settingsSnap.forEach((docSnap) => {
        settingsCache.set(docSnap.id, docSnap.data().value);
      });
    }

    const defaults: Record<string, string> = {
      hdp_link: 'https://forms.gle/f6ZiQtiqCAH1CLy87',
      omon_link: 'https://forms.gle/97m9hCsBFovYKKrX7',
      omon_urganch_link: 'https://forms.gle/97m9hCsBFovYKKrX7',
      omon_gurlan_link: 'https://forms.gle/97m9hCsBFovYKKrX7',
      omon_shovot_link: 'https://forms.gle/97m9hCsBFovYKKrX7',
      channel_username: CHANNEL_USERNAME
    };

    for (const [key, defVal] of Object.entries(defaults)) {
      if (!settingsCache.has(key)) {
        const docRef = doc(db, 'settings', key);
        await setDoc(docRef, { value: defVal }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.WRITE, `settings/${key}`));
        settingsCache.set(key, defVal);
      }
    }
  } catch (err: any) {
    if (err.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
    console.error("initDb error:", err.message);
  }
}

// ================= HELPERS =================
async function getSetting(key: string) {
  if (settingsCache.has(key)) {
    return settingsCache.get(key)!;
  }

  const docRef = doc(db, 'settings', key);
  try {
    const snap = await getDoc(docRef);
    const val = snap.exists() ? snap.data().value : null;
    if (val !== null) settingsCache.set(key, val);
    return val;
  } catch (e: any) {
    handleFirestoreError(e, OperationType.GET, `settings/${key}`);
    return null;
  }
}

async function setSetting(key: string, value: string) {
  settingsCache.set(key, value); // Immediately apply to cache for instant response

  // Background task to persist to firestore without blocking the user
  (async () => {
    const docRef = doc(db, 'settings', key);
    try {
      await setDoc(docRef, { value }, { merge: true });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, `settings/${key}`);
    }
  })();
}

const adminState = new Map<number, string>();

async function checkSubscription(ctx: any): Promise<boolean> {
  const userId = ctx.from.id;
  if (subCache.has(userId)) {
    return subCache.get(userId)!;
  }

  try {
    const rawChannel = getSettingSync('channel_username', CHANNEL_USERNAME);
    let channelId = rawChannel.trim();
    
    // Telegram API requires numeric ID or @username
    if (channelId.includes('t.me/')) {
      const parts = channelId.split('t.me/');
      const username = parts[1].replace(/\/$/, '');
      if (!username.startsWith('+') && !channelId.includes('joinchat')) {
        channelId = '@' + username;
      }
    } else if (!channelId.startsWith('@') && !channelId.startsWith('-') && !channelId.startsWith('http')) {
      channelId = '@' + channelId;
    }

    // Call Telegram API with 2 second timeout to prevent hanging
    const memberPromise = ctx.telegram.getChatMember(channelId, userId);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500));
    const member: any = await Promise.race([memberPromise, timeoutPromise]);

    const isSubscribed = (
      member.status === "member" ||
      member.status === "creator" ||
      member.status === "administrator"
    );
    
    if (isSubscribed) {
      subCache.set(userId, true);
    }
    return isSubscribed;
  } catch (err: any) {
    console.error("Subscription check error:", err.message);
    // On API error, if previously known or default, don't hard block
    return false;
  }
}

// Utility to fix any URL string from DB before passing to Telegram Markup
function formatButtonUrl(url: string | null | undefined): string {
  if (!url) return "https://telegram.org"; // Safe fallback
  let cleaned = url.trim();
  if (cleaned.startsWith('@')) {
      return `https://t.me/${cleaned.replace(/^@/, "")}`;
  }
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      return `https://${cleaned}`;
  }
  return cleaned;
}

function subscriptionKeyboard() {
  const channel = getSettingSync('channel_username', CHANNEL_USERNAME);
  const channelUrl = formatButtonUrl(channel);

  return Markup.inlineKeyboard([
    [
      Markup.button.url("Obuna bo'lish", channelUrl),
    ],
    [Markup.button.callback("Tekshirish", "check_sub")],
  ]);
}

function mainMenuKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: "HDP LC" }],
        [{ text: "Omon school Urganch filiali" }, { text: "Omon school Gurlan filiali" }],
        [{ text: "Omon school Shovot filiali" }]
      ],
      resize_keyboard: true,
      is_persistent: true
    }
  };
}

// ================= HANDLERS =================
if (bot) {
  bot.start(async (ctx) => {
    const userId = ctx.from.id;

    // Background task: ensure user exists in Firestore
    (async () => {
      const userRef = doc(db, 'users', String(userId));
      try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, { hdp: 0, omon: 0 });
        }
      } catch (e: any) {
        handleFirestoreError(e, OperationType.GET, `users/${userId}`);
      }
    })();

    const subscribed = await checkSubscription(ctx);

    if (!subscribed) {
      return ctx.reply("Botdan foydalanish uchun kanalga obuna bo‘ling:", subscriptionKeyboard());
    }

    return ctx.reply("Ish joyini tanlang:", mainMenuKeyboard());
  });

  bot.action("check_sub", async (ctx) => {
    subCache.delete(ctx.from.id);
    const subscribed = await checkSubscription(ctx);

    if (!subscribed) {
      return ctx.answerCbQuery("Siz hali obuna bo‘lmagansiz!", { show_alert: true });
    }

    ctx.answerCbQuery("✅ Obuna tasdiqlandi!").catch(() => {});
    await ctx.deleteMessage().catch(() => {});
    return ctx.reply("Ish joyini tanlang:", mainMenuKeyboard());
  });

  bot.hears("HDP LC", async (ctx) => {
    const subscribed = await checkSubscription(ctx);
    if (!subscribed) {
      return ctx.reply("Avval kanalga obuna bo‘ling:", subscriptionKeyboard());
    }

    // Background task: Analytics
    (async () => {
      try {
        const userRef = doc(db, 'users', String(ctx.from.id));
        await setDoc(userRef, { hdp: increment(1) }, { merge: true });
      } catch(e: any) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${ctx.from.id}`);
      }
    })();
    
    const hdpLink = getSettingSync('hdp_link');
    const safeUrl = formatButtonUrl(hdpLink);

    return ctx.reply("HDP LC uchun ariza topshirish:", Markup.inlineKeyboard([
      [Markup.button.url("Ariza topshirish", safeUrl)],
    ]));
  });

  bot.hears(["Omon school Urganch filiali", "Omon school Urganch filial"], async (ctx) => {
    const subscribed = await checkSubscription(ctx);
    if (!subscribed) {
      return ctx.reply("Avval kanalga obuna bo‘ling:", subscriptionKeyboard());
    }

    (async () => {
      try {
        const userRef = doc(db, 'users', String(ctx.from.id));
        await setDoc(userRef, { omon_urganch: increment(1), omon: increment(1) }, { merge: true });
      } catch(e: any) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${ctx.from.id}`);
      }
    })();
    
    const omonLink = getSettingSync('omon_urganch_link') || getSettingSync('omon_link');
    const safeUrl = formatButtonUrl(omonLink);

    return ctx.reply("Omon School (Urganch filiali) uchun ariza topshirish:", Markup.inlineKeyboard([
      [Markup.button.url("Ariza topshirish", safeUrl)],
    ]));
  });

  bot.hears(["Omon school Gurlan filiali", "Omon school Gurlan filial"], async (ctx) => {
    const subscribed = await checkSubscription(ctx);
    if (!subscribed) {
      return ctx.reply("Avval kanalga obuna bo‘ling:", subscriptionKeyboard());
    }

    (async () => {
      try {
        const userRef = doc(db, 'users', String(ctx.from.id));
        await setDoc(userRef, { omon_gurlan: increment(1), omon: increment(1) }, { merge: true });
      } catch(e: any) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${ctx.from.id}`);
      }
    })();
    
    const omonLink = getSettingSync('omon_gurlan_link') || getSettingSync('omon_link');
    const safeUrl = formatButtonUrl(omonLink);

    return ctx.reply("Omon School (Gurlan filiali) uchun ariza topshirish:", Markup.inlineKeyboard([
      [Markup.button.url("Ariza topshirish", safeUrl)],
    ]));
  });

  bot.hears(["Omon school Shovot filiali", "Omon school Shovot filial"], async (ctx) => {
    const subscribed = await checkSubscription(ctx);
    if (!subscribed) {
      return ctx.reply("Avval kanalga obuna bo‘ling:", subscriptionKeyboard());
    }

    (async () => {
      try {
        const userRef = doc(db, 'users', String(ctx.from.id));
        await setDoc(userRef, { omon_shovot: increment(1), omon: increment(1) }, { merge: true });
      } catch(e: any) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${ctx.from.id}`);
      }
    })();
    
    const omonLink = getSettingSync('omon_shovot_link') || getSettingSync('omon_link');
    const safeUrl = formatButtonUrl(omonLink);

    return ctx.reply("Omon School (Shovot filiali) uchun ariza topshirish:", Markup.inlineKeyboard([
      [Markup.button.url("Ariza topshirish", safeUrl)],
    ]));
  });

  bot.action("branch_omon_urganch", async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const subscribed = await checkSubscription(ctx);
    if (!subscribed) {
      return ctx.reply("Avval kanalga obuna bo‘ling:", subscriptionKeyboard());
    }

    (async () => {
      try {
        const userRef = doc(db, 'users', String(ctx.from.id));
        await setDoc(userRef, { omon_urganch: increment(1), omon: increment(1) }, { merge: true });
      } catch(e: any) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${ctx.from.id}`);
      }
    })();
    
    const omonLink = getSettingSync('omon_urganch_link') || getSettingSync('omon_link');
    const safeUrl = formatButtonUrl(omonLink);

    return ctx.reply("Omon School (Urganch filiali) uchun ariza topshirish:", Markup.inlineKeyboard([
      [Markup.button.url("Ariza topshirish", safeUrl)],
    ]));
  });

  bot.action("branch_omon_gurlan", async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const subscribed = await checkSubscription(ctx);
    if (!subscribed) {
      return ctx.reply("Avval kanalga obuna bo‘ling:", subscriptionKeyboard());
    }

    (async () => {
      try {
        const userRef = doc(db, 'users', String(ctx.from.id));
        await setDoc(userRef, { omon_gurlan: increment(1), omon: increment(1) }, { merge: true });
      } catch(e: any) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${ctx.from.id}`);
      }
    })();
    
    const omonLink = getSettingSync('omon_gurlan_link') || getSettingSync('omon_link');
    const safeUrl = formatButtonUrl(omonLink);

    return ctx.reply("Omon School (Gurlan filiali) uchun ariza topshirish:", Markup.inlineKeyboard([
      [Markup.button.url("Ariza topshirish", safeUrl)],
    ]));
  });

  bot.action("branch_omon_shovot", async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const subscribed = await checkSubscription(ctx);
    if (!subscribed) {
      return ctx.reply("Avval kanalga obuna bo‘ling:", subscriptionKeyboard());
    }

    (async () => {
      try {
        const userRef = doc(db, 'users', String(ctx.from.id));
        await setDoc(userRef, { omon_shovot: increment(1), omon: increment(1) }, { merge: true });
      } catch(e: any) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${ctx.from.id}`);
      }
    })();
    
    const omonLink = getSettingSync('omon_shovot_link') || getSettingSync('omon_link');
    const safeUrl = formatButtonUrl(omonLink);

    return ctx.reply("Omon School (Shovot filiali) uchun ariza topshirish:", Markup.inlineKeyboard([
      [Markup.button.url("Ariza topshirish", safeUrl)],
    ]));
  });

  bot.command("myid", (ctx) => {
    ctx.reply(`Sizning Telegram ID raqamingiz: <code>${ctx.from.id}</code>\n\nShu raqamni nusxalab, AI Studio'dagi "Secrets" (yoki Environment Variables) bo'limiga <b>ADMIN_ID</b> nomi bilan qo'shing. Shundan so'ng botni qayta ishga tushirsangiz /admin buyrug'i ishlaydi.`, { parse_mode: "HTML" });
  });

  async function sendAdminPanel(ctx) {
    let usersSnap: any = { docs: [], size: 0, forEach: () => {} };
    try {
      usersSnap = await getDocs(collection(db, 'users'));
    } catch(e: any) {
      handleFirestoreError(e, OperationType.LIST, 'users');
    }
    
    let totalHdp = 0;
    let totalOmon = 0;
    let totalOmonUrganch = 0;
    let totalOmonGurlan = 0;
    let totalOmonShovot = 0;
    usersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      totalHdp += data.hdp || 0;
      totalOmon += data.omon || 0;
      totalOmonUrganch += data.omon_urganch || 0;
      totalOmonGurlan += data.omon_gurlan || 0;
      totalOmonShovot += data.omon_shovot || 0;
    });
    
    const usersCount = usersSnap.size;

    const hdpLink = await getSetting('hdp_link');
    const omonLink = await getSetting('omon_link');
    const omonUrganchLink = await getSetting('omon_urganch_link') || omonLink;
    const omonGurlanLink = await getSetting('omon_gurlan_link') || omonLink;
    const omonShovotLink = await getSetting('omon_shovot_link') || omonLink;
    const channel = await getSetting('channel_username');

    const text = `📊 Statistika:\n\n👥 Foydalanuvchilar: ${usersCount}\n\n🔹 HDP LC: ${totalHdp}\n🔹 Urganch filiali: ${totalOmonUrganch}\n🔹 Gurlan filiali: ${totalOmonGurlan}\n🔹 Shovot filiali: ${totalOmonShovot}\n\n⚙️ <b>Joriy sozlamalar:</b>\nKanal: ${channel}\nHDP Link: ${hdpLink}\nUrganch Link: ${omonUrganchLink}\nGurlan Link: ${omonGurlanLink}\nShovot Link: ${omonShovotLink}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("✏️ Kanalni o'zgartirish", "edit_channel")],
      [Markup.button.callback("✏️ HDP silkani o'zgartirish", "edit_hdp")],
      [Markup.button.callback("✏️ Urganch silkani o'zgartirish", "edit_omon_urganch")],
      [Markup.button.callback("✏️ Gurlan silkani o'zgartirish", "edit_omon_gurlan")],
      [Markup.button.callback("✏️ Shovot silkani o'zgartirish", "edit_omon_shovot")],
      [Markup.button.callback("📢 Xabar tarqatish", "broadcast_msg")],
      [Markup.button.callback("❌ Bekor qilish", "cancel_admin")]
    ]);

    await ctx.reply(text, { parse_mode: "HTML", ...keyboard });
  }

  bot.command("admin", async (ctx) => {
    if (!ADMIN_ID || ctx.from.id !== ADMIN_ID) return;
    await sendAdminPanel(ctx);
  });

  bot.action("edit_channel", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    adminState.set(ctx.from.id, "awaiting_channel");
    ctx.reply("Yangi kanal username'ini yuboring (masalan: @yangi_kanal):");
    ctx.answerCbQuery();
  });

  bot.action("edit_hdp", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    adminState.set(ctx.from.id, "awaiting_hdp");
    ctx.reply("Yangi HDP LC silkasini yuboring (https://...):");
    ctx.answerCbQuery();
  });

  bot.action("edit_omon_urganch", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    adminState.set(ctx.from.id, "awaiting_omon_urganch");
    ctx.reply("Yangi Omon School Urganch filiali silkasini yuboring (https://...):");
    ctx.answerCbQuery();
  });

  bot.action("edit_omon_gurlan", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    adminState.set(ctx.from.id, "awaiting_omon_gurlan");
    ctx.reply("Yangi Omon School Gurlan filiali silkasini yuboring (https://...):");
    ctx.answerCbQuery();
  });

  bot.action("edit_omon_shovot", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    adminState.set(ctx.from.id, "awaiting_omon_shovot");
    ctx.reply("Yangi Omon School Shovot filiali silkasini yuboring (https://...):");
    ctx.answerCbQuery();
  });

  bot.action("broadcast_msg", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    adminState.set(ctx.from.id, "awaiting_broadcast");
    ctx.reply("Tarqatmoqchi bo'lgan xabaringizni yuboring (Matn, rasm, video va h.k):");
    ctx.answerCbQuery();
  });

  bot.action("cancel_admin", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    adminState.delete(ctx.from.id);
    ctx.deleteMessage().catch(() => {});
    ctx.answerCbQuery("Bekor qilindi");
  });

  bot.on("message", async (ctx, next) => {
    const userId = ctx.from.id;
    if (userId === ADMIN_ID && adminState.has(userId)) {
      const state = adminState.get(userId);

      if (state === "awaiting_broadcast") {
        adminState.delete(userId);
        ctx.reply("Xabar tarqatish boshlandi. Bu biroz vaqt olishi mumkin...");
        
        let usersSnap: any = { docs: [] };
        try {
          usersSnap = await getDocs(collection(db, 'users'));
        } catch(e: any) {
          handleFirestoreError(e, OperationType.LIST, 'users');
        }
        let successCount = 0;
        let failCount = 0;

        // Xabarlarni orqa fonda tarqatish (Queue orqali)
        (async () => {
          for (const docSnap of usersSnap.docs) {
            const user_id = Number(docSnap.id);
            await messageQueue.add(async () => {
              try {
                await ctx.copyMessage(user_id);
                successCount++;
              } catch (err) {
                failCount++;
              }
            });
          }
          await ctx.reply(`✅ Xabar tarqatish yakunlandi!\n\nYetkazildi: ${successCount} ta\nXatolik/Bloklaganlar: ${failCount} ta`);
        })();
        return;
      }

      const msg = ctx.message as any;
      if (!msg.text) {
        ctx.reply("Iltimos, faqat matn yuboring.");
        return;
      }
      const text = msg.text;

      if (state === "awaiting_channel") {
        subCache.clear();
        settingsCache.delete('channel_username');
        
        let cleanedChannel = text.trim();
        // Convert input formats into a universal URL link, or fallback to exact string if invite link
        if (!cleanedChannel.startsWith('http')) {
           if (cleanedChannel.startsWith('@')) {
               cleanedChannel = `https://t.me/${cleanedChannel.replace('@', '')}`;
           } else if (!cleanedChannel.startsWith('-')) {
               cleanedChannel = `https://t.me/${cleanedChannel}`;
           }
        }
        
        await setSetting('channel_username', cleanedChannel);
        await ctx.reply(`✅ Kanal muvaffaqiyatli o'zgartirildi!\nYangi havola: ${cleanedChannel}`);
      } else if (state === "awaiting_hdp") {
        settingsCache.delete('hdp_link');
        await setSetting('hdp_link', text);
        await ctx.reply("✅ HDP LC silkasi o'zgartirildi!");
      } else if (state === "awaiting_omon_urganch") {
        settingsCache.delete('omon_urganch_link');
        await setSetting('omon_urganch_link', text);
        await ctx.reply("✅ Omon School Urganch filiali silkasi o'zgartirildi!");
      } else if (state === "awaiting_omon_gurlan") {
        settingsCache.delete('omon_gurlan_link');
        await setSetting('omon_gurlan_link', text);
        await ctx.reply("✅ Omon School Gurlan filiali silkasi o'zgartirildi!");
      } else if (state === "awaiting_omon_shovot") {
        settingsCache.delete('omon_shovot_link');
        await setSetting('omon_shovot_link', text);
        await ctx.reply("✅ Omon School Shovot filiali silkasi o'zgartirildi!");
      }
      adminState.delete(userId);
      await sendAdminPanel(ctx);
      return;
    }
    return next();
  });
}

// ================= WEBHOOK & SERVER START =================
async function start() {
  app.use(express.json());

  // API Endpoints for Web Dashboard
  app.get('/api/health', (req, res) => {
    res.json({
      status: "ok",
      botConfigured: !!BOT_TOKEN,
      adminConfigured: !!ADMIN_ID,
      adminId: ADMIN_ID || null
    });
  });

  app.get('/api/stats', async (req, res) => {
    try {
      let usersSnap: any = { docs: [], size: 0, forEach: () => {} };
      try {
        usersSnap = await getDocs(collection(db, 'users'));
      } catch (e) {
        console.warn("Could not load users for stats:", e);
      }

      let totalHdp = 0;
      let totalOmon = 0;
      let totalOmonUrganch = 0;
      let totalOmonGurlan = 0;
      let totalOmonShovot = 0;

      usersSnap.forEach((docSnap: any) => {
        const data = docSnap.data();
        totalHdp += data.hdp || 0;
        totalOmon += data.omon || 0;
        totalOmonUrganch += data.omon_urganch || 0;
        totalOmonGurlan += data.omon_gurlan || 0;
        totalOmonShovot += data.omon_shovot || 0;
      });

      const channel = await getSetting('channel_username');
      const hdp_link = await getSetting('hdp_link');
      const omon_urganch_link = await getSetting('omon_urganch_link');
      const omon_gurlan_link = await getSetting('omon_gurlan_link');
      const omon_shovot_link = await getSetting('omon_shovot_link');

      res.json({
        botActive: !!BOT_TOKEN,
        adminConfigured: !!ADMIN_ID,
        adminId: ADMIN_ID || null,
        usersCount: usersSnap.size || 0,
        totalHdp,
        totalOmon,
        totalOmonUrganch,
        totalOmonGurlan,
        totalOmonShovot,
        settings: {
          channel_username: channel || '',
          hdp_link: hdp_link || '',
          omon_urganch_link: omon_urganch_link || '',
          omon_gurlan_link: omon_gurlan_link || '',
          omon_shovot_link: omon_shovot_link || ''
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key || typeof value !== 'string') {
        return res.status(400).json({ error: "Missing key or value" });
      }
      settingsCache.delete(key);
      await setSetting(key, value);
      res.json({ success: true, key, value });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/broadcast', async (req, res) => {
    try {
      if (!bot) {
        return res.status(400).json({ error: "BOT_TOKEN is not configured." });
      }
      const { messageText } = req.body;
      if (!messageText) {
        return res.status(400).json({ error: "Message text required." });
      }

      let usersSnap: any = { docs: [] };
      try {
        usersSnap = await getDocs(collection(db, 'users'));
      } catch (e: any) {
        handleFirestoreError(e, OperationType.LIST, 'users');
      }

      let successCount = 0;
      let failCount = 0;

      for (const docSnap of usersSnap.docs) {
        const user_id = Number(docSnap.id);
        await messageQueue.add(async () => {
          try {
            await bot.telegram.sendMessage(user_id, messageText);
            successCount++;
          } catch (err) {
            failCount++;
          }
        });
      }

      res.json({ success: true, sentCount: successCount, failCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  try {
    await initDb();
  } catch (err) {
    console.error("Database initialization failed:", err);
  }

  if (bot) {
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.WEBHOOK_DOMAIN;
    
    if (domain) {
      try {
        const webhookPath = `/telegraf/${bot.secretPathComponent()}`;
        app.use(bot.webhookCallback(webhookPath));
        await bot.telegram.setWebhook(`https://${domain}${webhookPath}`);
        console.log(`Bot launched using webhook on ${domain}`);
      } catch (err: any) {
        console.error("Failed to set webhook:", err.message);
      }
    } else {
      try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        bot.launch().then(() => {
          console.log('Bot launched using long polling.');
        }).catch((err: any) => {
          if (err.message.includes('409: Conflict')) {
            console.error("⚠️ XATOLIK: Bot ayni paytda boshqa joyda (masalan, AI Studio'da) ishlab turibdi.");
          } else {
            console.error("Failed to launch bot:", err.message);
          }
        });
      } catch (err: any) {
        console.error("Failed to delete webhook:", err.message);
      }
    }
  }

  // Vite Middleware for development SPA serving or Express static files in production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Calculate actual port for hosting environments like Railway
  const isRailway = !!process.env.RAILWAY_ENVIRONMENT_NAME || !!process.env.RAILWAY_STATIC_URL;
  const actualPort = (isRailway && process.env.PORT) ? parseInt(process.env.PORT) : PORT;

  const server = app.listen(actualPort, '0.0.0.0', () => {
    console.log(`Server running on port ${actualPort}`);
  });

  // graceful shutdown
  const shutdown = () => {
    console.log('Shutting down...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch(console.error);
