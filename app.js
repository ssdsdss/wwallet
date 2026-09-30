(function () {
  "use strict";

  const tg = window.Telegram?.WebApp || null;
  const API = "";

  if (tg) {
    tg.ready();
    tg.expand();

    try {
      tg.setHeaderColor("#0b0e14");
      tg.setBackgroundColor("#0b0e14");
    } catch (_) {}
  }

  let state = {
    user: null,
    isAdmin: false,
    appeals: []
  };

  const $ = id => document.getElementById(id);

  function fmt(value, digits = 2) {
    return Number(value || 0).toLocaleString("uk-UA", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function initData() {
    return tg?.initData || "";
  }

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData(),
      ...(options.headers || {})
    };

    const response = await fetch(API + path, {
      ...options,
      headers
    });

    let data = {};

    try {
      data = await response.json();
    } catch (_) {}

    if (!response.ok) {
      throw new Error(
        data.detail ||
        data.message ||
        "Ошибка запроса"
      );
    }

    return data;
  }

  /* =========================
     ЭКРАНЫ
  ========================= */

  function hideScreens() {
    [
      "screenBan",
      "screenPending",
      "screenRejected",
      "screenApproved"
    ].forEach(id => {
      const el = $(id);
      if (el) el.hidden = true;
    });
  }

  function showScreen(id) {
    hideScreens();

    const el = $(id);

    if (el) {
      el.hidden = false;
    }
  }

  /* =========================
     SHEET
  ========================= */

  function closeSheet() {
    const sheet = $("sheet");

    if (!sheet) return;

    sheet.hidden = true;
    sheet.classList.remove("open");
  }

  function openSheet(html) {
    const sheet = $("sheet");
    const content = $("sheetContent");

    if (!sheet || !content) return;

    content.innerHTML = html;

    sheet.hidden = false;
    sheet.classList.add("open");

    sheet.style.pointerEvents = "auto";
    content.style.pointerEvents = "auto";
  }

  /* =========================
     БАЛАНС
  ========================= */

  function renderBalance() {
    if (!state.user) return;

    const balance = Number(
      state.user.balance || 0
    );

    const balanceEl = $("balance");

    if (balanceEl) {
      balanceEl.textContent = fmt(balance);
    }

    const demoBalance = $("demoBalance");

    if (demoBalance) {
      demoBalance.textContent =
        fmt(balance) + " ₴";
    }

    const username = $("username");

    if (username) {
      username.textContent =
        state.user.username
          ? "@" + state.user.username
          : "Пользователь";
    }
  }

  /* =========================
     АКТИВЫ
  ========================= */

  function renderAssets() {
    const box = $("assets");

    if (!box) return;

    box.innerHTML = `
      <div class="asset-row">
        <div class="asset-icon usdt">$</div>

        <div class="asset-info">
          <b>Доллары</b>
          <span>USDT · 44,78 ₴</span>
        </div>

        <div class="asset-value">
          <b>8,94</b>
          <span>+0,33%</span>
        </div>
      </div>

      <div class="asset-row">
        <div class="asset-icon ton">◈</div>

        <div class="asset-info">
          <b>Toncoin</b>
          <span>TON · 249,10 ₴</span>
        </div>

        <div class="asset-value">
          <b>0</b>
          <span>0,00%</span>
        </div>
      </div>

      <div class="asset-row">
        <div class="asset-icon btc">₿</div>

        <div class="asset-info">
          <b>Bitcoin</b>
          <span>BTC · 2 850 000 ₴</span>
        </div>

        <div class="asset-value">
          <b>0</b>
          <span>0,00%</span>
        </div>
      </div>
    `;
  }

  /* =========================
     СТАТУС
  ========================= */

  function renderStatus() {
    if (!state.user) return;

    if (!state.user.banned) {
      hideScreens();
      return;
    }

    const appeal = state.user.appeal;

    if (
      appeal &&
      appeal.status === "pending"
    ) {
      showScreen("screenPending");
    }

    else if (
      appeal &&
      appeal.status === "rejected"
    ) {
      showScreen("screenRejected");
    }

    else if (
      appeal &&
      appeal.status === "approved"
    ) {
      showScreen("screenApproved");
    }

    else {
      showScreen("screenBan");
    }
  }

  /* =========================
     ADMIN
  ========================= */

  function renderAdmin() {
    const button = $("adminButton");

    if (button) {
      button.hidden = !state.isAdmin;
    }
  }

  /* =========================
     ЗАГРУЗКА ПОЛЬЗОВАТЕЛЯ
  ========================= */

  async function loadUser() {
    try {
      const data = await api("/api/me");

      state.user = data.user;
      state.isAdmin = !!data.is_admin;

      renderBalance();
      renderAssets();
      renderStatus();
      renderAdmin();

    } catch (error) {
      console.error(
        "loadUser:",
        error
      );
    }
  }

  /* =========================
     ОБРАЩЕНИЕ
  ========================= */

  function openAppeal() {
    openSheet(`
      <div class="sheet-title-row">

        <h2>Обращение</h2>

        <button
          type="button"
          class="sheet-close"
          data-action="close-sheet"
        >
          ×
        </button>

      </div>

      <p class="sheet-description">
        Опишите ситуацию и укажите причину,
        по которой вы считаете блокировку ошибочной.
      </p>

      <textarea
        id="appealText"
        class="appeal-input"
        placeholder="Введите текст обращения..."
      ></textarea>

      <button
        type="button"
        class="primary-btn"
        data-action="send-appeal"
      >
        Отправить обращение
      </button>
    `);
  }

  async function sendAppeal() {
    const input = $("appealText");

    const text =
      input?.value.trim() || "";

    if (!text) {
      alert(
        "Введите текст обращения."
      );
      return;
    }

    try {
      await api(
        "/api/appeal",
        {
          method: "POST",

          body: JSON.stringify({
            text: text
          })
        }
      );

      closeSheet();

      await loadUser();

    } catch (error) {
      alert(error.message);
    }
  }

  /* =========================
     ОКНО «ДЕЙСТВИЕ»
  ========================= */

  function openAction(type) {

    let html = "";

    /*
      ПРОМО
      Именно здесь были твои две
      неработающие кнопки.
    */

    if (type === "promo") {

      html = `
        <div class="sheet-title-row">

          <h2>Действие</h2>

          <button
            type="button"
            class="sheet-close"
            data-action="close-sheet"
          >
            ×
          </button>

        </div>

        <div class="action-grid">

          <button
            type="button"
            class="action-card"
            data-action="demo-action"
          >

            <span class="action-icon">
              💳
            </span>

            <b>
              Демо-операция
            </b>

            <small>
              Только внутри приложения
            </small>

          </button>


          <button
            type="button"
            class="action-card"
            data-action="details-action"
          >

            <span class="action-icon">
              ℹ️
            </span>

            <b>
              Подробнее
            </b>

            <small>
              Тестовый режим
            </small>

          </button>

        </div>
      `;

      openSheet(html);
      return;
    }


    /* ПЕРЕВОД */

    if (type === "send") {

      html = `
        <div class="sheet-title-row">

          <h2>Переказати</h2>

          <button
            type="button"
            class="sheet-close"
            data-action="close-sheet"
          >
            ×
          </button>

        </div>

        <input
          id="transferUid"
          class="sheet-input"
          type="number"
          placeholder="ID получателя"
        >

        <input
          id="transferAmount"
          class="sheet-input"
          type="number"
          step="0.01"
          placeholder="Сумма"
        >

        <button
          type="button"
          class="primary-btn"
          data-action="transfer"
        >
          Перевести
        </button>
      `;

      openSheet(html);
      return;
    }


    /* ПОПОЛНЕНИЕ */

    if (type === "topup") {

      html = `
        <div class="sheet-title-row">

          <h2>Пополнение</h2>

          <button
            type="button"
            class="sheet-close"
            data-action="close-sheet"
          >
            ×
          </button>

        </div>

        <p class="sheet-description">
          Это демонстрационная операция.
        </p>

        <button
          type="button"
          class="primary-btn"
          data-action="demo-action"
        >
          Пополнить демо-баланс
        </button>
      `;

      openSheet(html);
      return;
    }


    /* ВЫВОД */

    if (type === "withdraw") {

      html = `
        <div class="sheet-title-row">

          <h2>Вывод</h2>

          <button
            type="button"
            class="sheet-close"
            data-action="close-sheet"
          >
            ×
          </button>

        </div>

        <p class="sheet-description">
          Вывод средств в DEMO Wallet
          не выполняется.
        </p>

        <button
          type="button"
          class="primary-btn"
          data-action="close-sheet"
        >
          Понятно
        </button>
      `;

      openSheet(html);
      return;
    }


    /* ОБМЕН */

    if (type === "swap") {

      html = `
        <div class="sheet-title-row">

          <h2>Обмен</h2>

          <button
            type="button"
            class="sheet-close"
            data-action="close-sheet"
          >
            ×
          </button>

        </div>

        <p class="sheet-description">
          Обмен доступен только
          в тестовом режиме.
        </p>

        <button
          type="button"
          class="primary-btn"
          data-action="demo-action"
        >
          Открыть демо
        </button>
      `;

      openSheet(html);
      return;
    }


    /* QR */

    if (type === "scan") {

      html = `
        <div class="sheet-title-row">

          <h2>Сканирование</h2>

          <button
            type="button"
            class="sheet-close"
            data-action="close-sheet"
          >
            ×
          </button>

        </div>

        <p class="sheet-description">
          Сканер QR работает только
          в демонстрационном режиме.
        </p>

        <button
          type="button"
          class="primary-btn"
          data-action="details-action"
        >
          Подробнее
        </button>
      `;

      openSheet(html);
      return;
    }


    /* DEFAULT */

    openSheet(`
      <div class="sheet-title-row">

        <h2>Действие</h2>

        <button
          type="button"
          class="sheet-close"
          data-action="close-sheet"
        >
          ×
        </button>

      </div>

      <div class="action-grid">

        <button
          type="button"
          class="action-card"
          data-action="demo-action"
        >
          <span class="action-icon">
            💳
          </span>

          <b>
            Демо-операция
          </b>

          <small>
            Только внутри приложения
          </small>
        </button>


        <button
          type="button"
          class="action-card"
          data-action="details-action"
        >
          <span class="action-icon">
            ℹ️
          </span>

          <b>
            Подробнее
          </b>

          <small>
            Тестовый режим
          </small>
        </button>

      </div>
    `);
  }

  /* =========================
     ПЕРЕВОД
  ========================= */

  async function transfer() {

    const uid =
      Number($("transferUid")?.value);

    const amount =
      Number($("transferAmount")?.value);

    if (
      !uid ||
      !amount ||
      amount <= 0
    ) {
      alert(
        "Введите ID и сумму."
      );
      return;
    }

    try {

      await api(
        "/api/tx",
        {
          method: "POST",

          body: JSON.stringify({
            to_uid: uid,
            amount: amount,
            note: "Перевод"
          })
        }
      );

      closeSheet();

      await loadUser();

    } catch (error) {
      alert(error.message);
    }
  }

  /* =========================
     ADMIN
  ========================= */

  async function loadAppeals() {

    if (!state.isAdmin) return;

    try {

      const data =
        await api(
          "/api/admin/appeals"
        );

      state.appeals =
        data.appeals || [];

      const list =
        $("appealsList") ||
        $("adminAppeals");

      if (!list) return;

      if (!state.appeals.length) {

        list.innerHTML =
          "<div>Апелляций нет.</div>";

        return;
      }

      list.innerHTML =
        state.appeals
          .map(a => `
            <button
              type="button"
              class="admin-appeal"
              data-action="admin-appeal"
              data-uid="${a.uid}"
            >

              <b>
                ${
                  a.username
                    ? "@" + a.username
                    : a.uid
                }
              </b>

              <small>
                ${a.status || "pending"}
              </small>

            </button>
          `)
          .join("");

    } catch (error) {

      console.error(
        "loadAppeals:",
        error
      );

    }
  }

  function openAdmin() {

    const panel =
      $("adminPanel");

    if (panel) {
      panel.hidden = false;
    }

    loadAppeals();
  }

  function closeAdmin() {

    const panel =
      $("adminPanel");

    if (panel) {
      panel.hidden = true;
    }
  }

  async function openAppealForAdmin(uid) {

    try {

      const data =
        await api(
          "/api/admin/appeal/" +
          encodeURIComponent(uid)
        );

      const info =
        $("adminAppealInfo");

      const text =
        $("adminAppealText");

      if (info) {

        info.textContent =
          "ID: " + uid +
          (
            data.username
              ? " · @" + data.username
              : ""
          );

      }

      if (text) {

        text.textContent =
          data.appeal?.text || "";

      }

      const view =
        $("adminAppealView");

      if (view) {
        view.hidden = false;
      }

      const approve =
        $("acceptAppeal");

      const reject =
        $("rejectAppeal");

      if (approve) {
        approve.dataset.uid = uid;
      }

      if (reject) {
        reject.dataset.uid = uid;
      }

    } catch (error) {

      alert(error.message);

    }
  }

  async function decideAppeal(
    uid,
    decision
  ) {

    try {

      await api(
        "/api/admin/appeal/" +
        encodeURIComponent(uid) +
        "/decision",
        {
          method: "POST",

          body: JSON.stringify({
            decision: decision
          })
        }
      );

      await loadAppeals();

      const view =
        $("adminAppealView");

      if (view) {
        view.hidden = true;
      }

      await loadUser();

    } catch (error) {

      alert(error.message);

    }
  }

  /* =========================
     ГЛАВНЫЙ ОБРАБОТЧИК КЛИКОВ
  ========================= */

  document.addEventListener(
    "click",
    async function (event) {

      /*
       * closest() очень важен:
       * если пользователь нажал на <b>
       * или <span> внутри кнопки,
       * всё равно находится сама кнопка.
       */

      const target =
        event.target.closest(
          "[data-action], [data-tab]"
        );

      if (!target) return;

      event.preventDefault();
      event.stopPropagation();

      const action =
        target.dataset.action;


      /* Открыть окно */

      if (action === "sheet") {

        openAction(
          target.dataset.arg || ""
        );

        return;
      }


      /* Закрыть */

      if (
        action === "close-sheet"
      ) {

        closeSheet();

        return;
      }


      /* Обращение */

      if (
        action === "send-appeal"
      ) {

        await sendAppeal();

        return;
      }


      /* Перевод */

      if (
        action === "transfer"
      ) {

        await transfer();

        return;
      }


      /* =====================
         ВОТ ЭТИ ДВЕ КНОПКИ
         ТЕПЕРЬ РАБОТАЮТ
      ===================== */

      if (
        action === "demo-action"
      ) {

        closeSheet();

        openSheet(`
          <div class="sheet-title-row">

            <h2>Демо-операция</h2>

            <button
              type="button"
              class="sheet-close"
              data-action="close-sheet"
            >
              ×
            </button>

          </div>

          <p class="sheet-description">
            Это тестовая функция DEMO Wallet.
            Реальные средства не используются.
          </p>

          <button
            type="button"
            class="primary-btn"
            data-action="close-sheet"
          >
            Понятно
          </button>
        `);

        return;
      }


      if (
        action === "details-action"
      ) {

        closeSheet();

        openSheet(`
          <div class="sheet-title-row">

            <h2>Подробнее</h2>

            <button
              type="button"
              class="sheet-close"
              data-action="close-sheet"
            >
              ×
            </button>

          </div>

          <p class="sheet-description">
            DEMO Wallet — тестовое
            приложение. Все операции
            выполняются только в
            демонстрационном режиме.
          </p>

          <button
            type="button"
            class="primary-btn"
            data-action="close-sheet"
          >
            Закрыть
          </button>
        `);

        return;
      }


      /* Обращение */

      if (
        action === "appeal"
      ) {

        openAppeal();

        return;
      }


      /* ADMIN */

      if (
        action === "admin"
      ) {

        openAdmin();

        return;
      }


      if (
        action === "admin-close"
      ) {

        closeAdmin();

        return;
      }


      if (
        action === "admin-appeal"
      ) {

        await openAppealForAdmin(
          Number(
            target.dataset.uid
          )
        );

        return;
      }


      if (
        action === "accept-appeal"
      ) {

        await decideAppeal(
          Number(
            target.dataset.uid
          ),
          "approve"
        );

        return;
      }


      if (
        action === "reject-appeal"
      ) {

        await decideAppeal(
          Number(
            target.dataset.uid
          ),
          "reject"
        );

        return;
      }


      /* Вкладки */

      const tab =
        target.dataset.tab;

      if (tab) {

        document
          .querySelectorAll(
            "[data-tab]"
          )
          .forEach(
            el =>
              el.classList.remove(
                "active"
              )
          );

        target.classList.add(
          "active"
        );

        return;
      }

    },
    true
  );


  /* =========================
     ЗАКРЫТИЕ SHEET
  ========================= */

  const sheet =
    $("sheet");

  if (sheet) {

    sheet.addEventListener(
      "click",
      function (event) {

        /*
         * Закрываем только если
         * нажали на фон.
         *
         * Внутри окна клики
         * НЕ закрывают его.
         */

        if (
          event.target === sheet
        ) {

          closeSheet();

        }

      }
    );

  }


  /* =========================
     ЗАПУСК
  ========================= */

  renderAssets();

  loadUser();

  setInterval(
    function () {

      loadUser();

      if (state.isAdmin) {
        loadAppeals();
      }

    },
    5000
  );


  window.DemoWallet = {

    reload: loadUser,

    openAction,

    openAppeal,

    closeSheet,

    openAdmin,

    closeAdmin

  };

})();