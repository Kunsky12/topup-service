// ---------------- i18n Strings ----------------
const i18n = {
  km: {
    enterPlayerId:      "⚠️ សូមបញ្ចូល Player ID របស់អ្នក",
    selectPack:         "⚠️ សូមជ្រើសរើសកញ្ចប់",
    selectPayment:      "⚠️ សូមជ្រើសរើសវិធីបង់ប្រាក់",
    invalidProfile:     "❌ Player ID ឬប្រវត្តិរូបមិនត្រឹមត្រូវ។",
    serverError:        "❌ មានបញ្ហាក្នុងការភ្ជាប់ម៉ាស៊ីន ឬ Player ID មិនត្រឹមត្រូវ។",
    copied:             "✅ បានចម្លង!",
    copyFailed:         "❌ ចម្លងបានបរាជ័យ",
    expired:            "អស់សុពលភាព",
    paymentExpired:     "❌ ការទូទាត់អស់សុពលភាព។",
    noOrderToCancel:    "គ្មានការបញ្ជាទិញត្រូវបោះបង់",
    cancelConfirm:      "តើអ្នកពិតជាចង់បោះបង់ការបញ្ជាទិញ?",
    yes:                "បាទ/ចាស",
    no:                 "ទេ",
    cancelSuccess:      "✅ បានបោះបង់ការបញ្ជាទិញដោយជោគជ័យ",
    cancelAlready:      "⚠️ ការបញ្ជាទិញត្រូវបានបោះបង់ ឬអស់សុពលភាពហើយ",
    cancelFailed:       "❌ បោះបង់ការបញ្ជាទិញបានបរាជ័យ៖ ",
    cancelNetworkError: "❌ បោះបង់បានបរាជ័យ (បញ្ហាបណ្តាញ)។",
    expiresIn:          "អស់សុពលភាពក្នុង៖",
    remark:             "Remark",
    purpose:            "Purpose",
  },
  en: {
    enterPlayerId:      "⚠️ Please enter your Player ID",
    selectPack:         "⚠️ Please select a top-up pack",
    selectPayment:      "⚠️ Please select a payment option",
    invalidProfile:     "❌ Player ID or profile invalid.",
    serverError:        "❌ Error connecting to server or invalid Player ID.",
    copied:             "✅ Copied!",
    copyFailed:         "❌ Failed to copy",
    expired:            "Expired",
    paymentExpired:     "❌ Payment expired.",
    noOrderToCancel:    "No order to cancel",
    cancelConfirm:      "Are you sure you want to cancel?",
    yes:                "Yes",
    no:                 "No",
    cancelSuccess:      "✅ Order cancelled successfully",
    cancelAlready:      "⚠️ Order was already canceled or expired",
    cancelFailed:       "❌ Failed to cancel order: ",
    cancelNetworkError: "❌ Failed to cancel order (network error).",
    expiresIn:          "Expires in:",
    remark:             "Remark",
    purpose:            "Purpose",
  }
};

// Returns the translated string for the active language
function t(key) {
  const lang = (typeof currentLang !== 'undefined' ? currentLang : 'km');
  return (i18n[lang] && i18n[lang][key]) ? i18n[lang][key] : i18n['km'][key];
}

// ---------------- Elements ----------------
const toastEl        = document.getElementById("modal-toast");
const globalToast    = document.getElementById("global-toast");
const paymentModal   = document.getElementById("payment-modal");
const submitBtn      = document.getElementById("submit-order");
const playerInput    = document.getElementById("player-id");
const contactInput   = document.getElementById("contact-info");
const topupButtons   = document.querySelectorAll(".topup-btn");
const abaBtn         = document.getElementById("aba-btn");
const acledaBtn      = document.getElementById("acleda-btn");
const abaPrice       = document.getElementById("aba-price");
const acledaPrice    = document.getElementById("acleda-price");
const paymentProfile = document.getElementById("payment-profile");
const paymentAvatar  = document.getElementById("payment-avatar");
const paymentName    = document.getElementById("payment-name");
const qrImage        = document.getElementById("qr-image");
const paymentNote    = document.getElementById("payment-note");
const noteType       = document.getElementById("note-type");
const copyNoteBtn    = document.getElementById("copy-note");
const closeModalBtn  = document.getElementById("close-modal");
const cancelOrderBtn = document.getElementById("cancel-order");

// ---------------- State ----------------
let selectedPack     = null;
let selectedPayment  = null;
let orderType        = "RP";
let orderAmount      = 0;
let avatarUrlGlobal  = "";
let currentOrderCode = null;
let paymentInterval  = null;
let orderExpireTime  = null;
let scrollPosition   = 0;

// ---------------- DOM Ready ----------------
document.addEventListener("DOMContentLoaded", () => {
  if (paymentModal) {
    paymentModal.classList.add("hidden");
    paymentModal.style.display = 'none';
  }
  hideAllToasts();
});

function hideAllToasts() {
  [toastEl, globalToast].forEach(el => {
    if (!el) return;
    el.classList.remove("opacity-100");
    el.classList.add("opacity-0");
    el.style.pointerEvents = "none";
  });
}

// ---------------- Open Payment Modal ----------------
function openPaymentModal() {
  scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  document.body.style.position = 'fixed';
  document.body.style.top      = `-${scrollPosition}px`;
  document.body.style.left     = '0';
  document.body.style.right    = '0';
  document.body.style.width    = '100%';
  paymentModal.classList.remove("hidden");
  paymentModal.style.display = 'flex';
}

// ---------------- Close Payment Modal ----------------
function closePaymentModal() {
  paymentModal.classList.add("hidden");
  paymentModal.style.display = 'none';
  document.body.style.position = '';
  document.body.style.top      = '';
  document.body.style.left     = '';
  document.body.style.right    = '';
  document.body.style.width    = '';
  window.scrollTo(0, scrollPosition);

  if (paymentInterval) {
    clearInterval(paymentInterval);
    paymentInterval = null;
  }
  currentOrderCode = null;
}

// ---------------- Pack Selection ----------------
topupButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    topupButtons.forEach((b) => b.classList.remove("ring-4", "ring-yellow-500", "gold-gradient-ring"));
    btn.classList.add("ring-4", "ring-yellow-500", "gold-gradient-ring");

    selectedPack  = btn.dataset.pack;
    displayPack   = btn.dataset.display;
    orderType     = btn.classList.contains("vip-crown") ? "VIP Membership" : "RP";
    orderAmount   = parseFloat(btn.dataset.price || 0.99).toFixed(2);

    abaPrice.textContent    = `$${orderAmount}`;
    acledaPrice.textContent = `$${orderAmount}`;
  });
});

// ---------------- Payment Selection ----------------
abaBtn.addEventListener("click", () => {
  selectedPayment = "ABA Bank";
  abaBtn.classList.add("ring-4", "ring-yellow-500");
  acledaBtn.classList.remove("ring-4", "ring-yellow-500");
});

acledaBtn.addEventListener("click", () => {
  selectedPayment = "ACLEDA Bank";
  acledaBtn.classList.add("ring-4", "ring-yellow-500");
  abaBtn.classList.remove("ring-4", "ring-yellow-500");
});

// ---------------- Submit Order ----------------
submitBtn.addEventListener("click", async () => {
  const playerId = playerInput.value.trim();
  const contact  = contactInput.value.trim();

  if (!playerId)        return showGlobalToast(t('enterPlayerId'));
  if (!selectedPack)    return showGlobalToast(t('selectPack'));
  if (!selectedPayment) return showGlobalToast(t('selectPayment'));

  submitBtn.disabled = true;
  submitBtn.classList.add("opacity-50", "cursor-not-allowed");

  try {
    const response = await fetch('/api/topup/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        type:          orderType,
        pack:          selectedPack,
        amount:        parseFloat(orderAmount),
        paymentMethod: selectedPayment,
        contactInfo:   contact,
      })
    });

    const data = await response.json();

    if (!data.success || !data.orderData) throw new Error("Backend failed to create order.");

    const orderData  = data.orderData;
    const orderCode  = orderData.orderCode;
    const profile    = orderData.profile || {};
    currentOrderCode = orderCode;

    if (!profile || !orderCode) {
      showGlobalToast(t('invalidProfile'));
      await cancelOrder(orderCode);
      resetSubmitButton();
      return;
    }

    paymentProfile.classList.remove("hidden");

    avatarUrlGlobal   = profile.avatarUrl || "";
    paymentAvatar.src = (avatarUrlGlobal && avatarUrlGlobal.trim() !== "")
      ? avatarUrlGlobal
      : "images/default_avatar.webp";
    paymentAvatar.onerror   = () => { paymentAvatar.src = "images/default_avatar.webp"; };
    paymentName.textContent = profile.displayName || "Unknown Player";

    qrImage.src = selectedPayment === "ABA Bank"
      ? `images/aba-${orderAmount}.webp`
      : `images/acleda-${orderAmount}.webp`;

    noteType.textContent    = selectedPayment === "ABA Bank" ? t('remark') : t('purpose');
    paymentNote.textContent = orderCode;

    setPaymentInstructions(selectedPayment === "ABA Bank" ? "aba" : "acleda");

    openPaymentModal();
    startPaymentTimer(5);

  } catch (err) {
    console.error(err);
    showGlobalToast(t('serverError'));
    resetSubmitButton();
  }
});

// ---------------- Copy Transfer Note ----------------
copyNoteBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(paymentNote.textContent)
    .then(() => showGlobalToast(t('copied')))
    .catch(() => showGlobalToast(t('copyFailed')));
});

// ---------------- Payment Timer ----------------
function startPaymentTimer(minutes) {
  orderExpireTime = Date.now() + minutes * 60 * 1000;
  if (paymentInterval) clearInterval(paymentInterval);
  paymentInterval = setInterval(updateTimer, 1000);
  updateTimer();
}

function updateTimer() {
  const timerEl = document.getElementById("payment-timer");
  if (!timerEl) return;

  const remaining = orderExpireTime - Date.now();

  if (remaining <= 0) {
    clearInterval(paymentInterval);
    paymentInterval = null;
    timerEl.textContent = t('expired');
    showGlobalToast(t('paymentExpired'));
    if (currentOrderCode) cancelOrder(currentOrderCode);
    return;
  }

  const seconds = Math.floor(remaining / 1000);
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  timerEl.textContent = `${t('expiresIn')} ${m}:${s}`;
}

// ---------------- Cancel Order with Confirmation ----------------
cancelOrderBtn.addEventListener("click", () => {
  if (!currentOrderCode) return showGlobalToast(t('noOrderToCancel'));
  showConfirmationToast();
});

function showConfirmationToast() {
  const confirmDiv = document.createElement('div');
  confirmDiv.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-3 rounded shadow-lg z-50 flex items-center gap-2 max-w-md w-full';

  const yesId = `confirm-yes-${Date.now()}`;
  const noId  = `confirm-no-${Date.now()}`;

  confirmDiv.innerHTML = `
    <span class="flex-1">${t('cancelConfirm')}</span>
    <button id="${yesId}" class="bg-red-600 hover:bg-red-500 px-3 py-1 rounded text-white text-sm">${t('yes')}</button>
    <button id="${noId}"  class="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-white text-sm">${t('no')}</button>
  `;

  document.body.appendChild(confirmDiv);

  document.getElementById(yesId).addEventListener("click", async () => {
    document.body.removeChild(confirmDiv);
    if (currentOrderCode) await cancelOrder(currentOrderCode);
  });

  document.getElementById(noId).addEventListener("click", () => {
    document.body.removeChild(confirmDiv);
  });

  setTimeout(() => {
    if (document.body.contains(confirmDiv)) document.body.removeChild(confirmDiv);
  }, 10000);
}

// ---------------- Event Listeners ----------------
closeModalBtn.addEventListener("click", async () => {
  if (currentOrderCode) await cancelOrder(currentOrderCode);
  closePaymentModal();
});

const confirmModal = document.getElementById("confirm-modal");
const confirmYes   = document.getElementById("confirm-yes");
const confirmNo    = document.getElementById("confirm-no");

paymentModal.addEventListener("click", (e) => {
  if (e.target === paymentModal && currentOrderCode) {
    confirmModal.classList.remove("hidden");
  } else if (e.target === paymentModal) {
    closePaymentModal();
  }
});

confirmYes.addEventListener("click", () => {
  cancelOrder(currentOrderCode);
  confirmModal.classList.add("hidden");
  closePaymentModal();
});

confirmNo.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
});

// ---------------- Toast Helper ----------------
function showGlobalToast(message) {
  globalToast.textContent = message;
  globalToast.classList.remove("opacity-0");
  globalToast.classList.add("opacity-100");
  globalToast.style.pointerEvents = "auto";
  setTimeout(() => {
    globalToast.classList.remove("opacity-100");
    globalToast.classList.add("opacity-0");
    globalToast.style.pointerEvents = "none";
  }, 3000);
}

// ---------------- Cancel Order Function ----------------
async function cancelOrder(orderCode) {
  if (!orderCode) return;

  cancelOrderBtn.disabled = true;
  cancelOrderBtn.classList.add("opacity-50", "cursor-not-allowed");

  try {
    const response = await fetch(`/api/topup/cancel/${orderCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();

    if (response.ok && data.success) {
      showGlobalToast(t('cancelSuccess'));
    } else if (data.success) {
      showGlobalToast(t('cancelAlready'));
    } else {
      showGlobalToast(t('cancelFailed') + (data.message || ''));
    }
  } catch (err) {
    console.error(err);
    showGlobalToast(t('cancelNetworkError'));
  }

  clearInterval(paymentInterval);
  paymentInterval = null;
  resetSubmitButton();
  closePaymentModal();
}

// ---------------- Payment Instructions ----------------
function setPaymentInstructions(bank) {
  const prefix = bank === 'aba' ? 'aba' : 'acleda';
  document.getElementById('instruction-step1').src = `images/${prefix}-step1.webp`;
  document.getElementById('instruction-step2').src = `images/${prefix}-step2.webp`;
  document.getElementById('instruction-step3').src = `images/${prefix}-step3.webp`;
}

// ---------------- Reset Submit Button ----------------
function resetSubmitButton() {
  submitBtn.disabled = false;
  submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
}
