(() => {
  "use strict";

  const STORE_KEY = "woodlife_crm_v1";
  const STATUS = [
    { id: "lead", label: "Новая заявка", progress: 8 },
    { id: "measure", label: "Замер", progress: 22 },
    { id: "design", label: "3D-проект", progress: 42 },
    { id: "contract", label: "Согласование", progress: 56 },
    { id: "production", label: "Производство", progress: 74 },
    { id: "delivery", label: "Доставка", progress: 88 },
    { id: "install", label: "Монтаж", progress: 96 },
    { id: "done", label: "Готово", progress: 100 },
  ];

  const seed = {
    orders: [
      { id: "WL-1042", client: "Анна Волкова", phone: "+7 927 411-25-16", type: "Кухня", title: "Кухня «Тихий графит»", status: "production", budget: 438000, paid: 260000, deadline: "2026-09-14", manager: "Алексей", address: "Саратов, ул. Вольская, 81", note: "Фасады AGT, столешница компакт-плита. Техника встроенная.", updated: "Сегодня, 11:40" },
      { id: "WL-1041", client: "Максим Серов", phone: "+7 917 820-14-90", type: "Гардеробная", title: "Гардеробная «Орех»", status: "design", budget: 285000, paid: 50000, deadline: "2026-09-28", manager: "Мария", address: "Энгельс, ЖК Облака", note: "Нужна подсветка и секция для чемоданов.", updated: "Сегодня, 09:15" },
      { id: "WL-1040", client: "Елена Крылова", phone: "+7 905 380-44-62", type: "Шкаф", title: "Шкаф в нишу", status: "measure", budget: 146000, paid: 0, deadline: "2026-10-02", manager: "Алексей", address: "Саратов, ул. Шелковичная, 12", note: "Сложная геометрия стены, скрытые ручки.", updated: "Вчера, 18:20" },
      { id: "WL-1039", client: "Илья Громов", phone: "+7 927 555-17-08", type: "Кухня", title: "Кухня-гостиная", status: "install", budget: 612000, paid: 612000, deadline: "2026-08-25", manager: "Мария", address: "Саратов, ЖК Европейский", note: "Монтаж назначен на 25 августа, 09:00.", updated: "Вчера, 16:05" },
      { id: "WL-1038", client: "Ольга Миронова", phone: "+7 987 304-67-02", type: "Санузел", title: "Графитовая ниша", status: "done", budget: 118000, paid: 118000, deadline: "2026-08-17", manager: "Алексей", address: "Саратов, ул. Рабочая, 22", note: "Проект завершён. Запросить отзыв.", updated: "17 августа" },
    ],
    tasks: [
      { id: 1, text: "Подтвердить цвет фасадов с Анной", orderId: "WL-1042", due: "Сегодня, 14:00", done: false },
      { id: 2, text: "Отправить 3D-визуализацию Максиму", orderId: "WL-1041", due: "Сегодня, 17:00", done: false },
      { id: 3, text: "Замер ниши у Елены", orderId: "WL-1040", due: "Завтра, 11:30", done: false },
      { id: 4, text: "Запросить отзыв по готовому проекту", orderId: "WL-1038", due: "25 августа", done: true },
    ],
    leads: [],
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = (value) => new Intl.NumberFormat("ru-RU").format(Number(value || 0)) + " ₽";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const statusInfo = (id) => STATUS.find((item) => item.id === id) || STATUS[0];

  function loadData() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORE_KEY));
      if (stored?.orders && stored?.tasks) return stored;
    } catch {}
    localStorage.setItem(STORE_KEY, JSON.stringify(seed));
    return structuredClone(seed);
  }

  let data = loadData();
  let adminSection = "overview";

  function saveData() {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  // Public page
  const header = $("#site-header");
  const syncHeader = () => header.classList.toggle("scrolled", scrollY > 40);
  addEventListener("scroll", syncHeader, { passive: true });
  syncHeader();
  $(".menu-button")?.addEventListener("click", () => header.classList.toggle("menu-open"));
  $$(".main-nav a").forEach((link) => link.addEventListener("click", () => header.classList.remove("menu-open")));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible"));
  }, { threshold: 0.12 });
  $$(".reveal").forEach((node) => observer.observe(node));

  $$(".project-filters button").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".project-filters button").forEach((item) => item.classList.toggle("active", item === button));
      $$(".project-card").forEach((card) => {
        const show = button.dataset.filter === "all" || card.dataset.category === button.dataset.filter;
        card.classList.toggle("hidden", !show);
      });
    });
  });

  const projects = {
    kitchen: {
      kicker: "Кухня · реальный проект",
      title: "Графит и тёплый дуб",
      text: "Компактная кухня, где три линии фасадов спокойно дополняют друг друга. Нижний и верхний ряды выполнены из AGT, средний древесный ряд — Kronospan.",
      details: [["Задача", "Максимум хранения на небольшой площади"], ["Материалы", "AGT · Kronospan"], ["Особенность", "Три уровня фасадов"], ["Город", "Саратов"]],
      images: ["archive-01.jpg","archive-02.jpg","archive-03.jpg","archive-04.jpg","archive-05.jpg","archive-06.jpg","archive-07.jpg"],
    },
    white: {
      kicker: "Встроенная мебель · реальный проект",
      title: "Белая галактика",
      text: "Два вместительных шкафа встроены в сложную нишу так, чтобы не мешать друг другу и сохранить ощущение лёгкости. Точная посадка без видимых зазоров.",
      details: [["Задача", "Скрыть два шкафа в одной нише"], ["Фасады", "AGT 3006 Matt Galaxy White"], ["Акцент", "Ручки под золото"], ["Точность", "Посадка до миллиметра"]],
      images: ["project-08.jpg","project-09.jpg","project-10.jpg","project-11.jpg","project-12.jpg","project-13.jpg"],
    },
    bathroom: {
      kicker: "Система хранения · реальный проект",
      title: "Идеальная ниша",
      text: "Встроенный шкаф-пенал спрятал сложную нишу с инсталляцией и скошенными углами. Снаружи — чистая графитовая плоскость без ручек, внутри — глубокая система хранения.",
      details: [["Задача", "Сложная геометрия санузла"], ["Корпус", "Egger Графит"], ["Фасады", "МДФ в плёнке «Скат»"], ["Фурнитура", "Firmax · push-to-open"]],
      images: ["project-14.jpg","project-15.jpg","project-16.jpg","project-17.jpg","project-18.jpg","project-19.jpg","project-20.jpg"],
    },
    commercial: {
      kicker: "Для бизнеса · реальный проект",
      title: "«Прохук» за 14 дней",
      text: "Спроектировали, изготовили и установили торговое оборудование для новой точки: витрины, закрытое хранение и стойку ресепшен в фирменных цветах.",
      details: [["Срок", "14 дней от согласования"], ["Состав", "Витрины · хранение · ресепшен"], ["Формат", "Торговое оборудование"], ["Результат", "Готовая точка под открытие"]],
      images: ["project-01.jpg","project-02.jpg","project-03.jpg","project-04.jpg","project-05.jpg","project-06.jpg","project-07.jpg"],
    },
  };
  let activeProject = null;
  let activePhoto = 0;

  function showProjectPhoto(index) {
    if (!activeProject) return;
    const images = activeProject.images;
    activePhoto = (index + images.length) % images.length;
    const file = `assets/woodlife/${images[activePhoto]}`;
    $("#project-main-image").src = file;
    $("#project-main-image").alt = `${activeProject.title}, фотография ${activePhoto + 1}`;
    $("#project-gallery-count").textContent = `${activePhoto + 1} / ${images.length}`;
    $$("#project-thumbs button").forEach((button, i) => button.classList.toggle("active", i === activePhoto));
  }

  function openProject(id) {
    activeProject = projects[id];
    if (!activeProject) return;
    activePhoto = 0;
    $("#project-kicker").textContent = activeProject.kicker;
    $("#project-modal-title").textContent = activeProject.title;
    $("#project-modal-text").textContent = activeProject.text;
    $("#project-modal-details").innerHTML = activeProject.details.map(([name, value]) => `<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join("");
    $("#project-thumbs").innerHTML = activeProject.images.map((image, index) => `<button type="button" data-photo="${index}" aria-label="Открыть фотографию ${index + 1}"><img src="assets/woodlife/${image}" alt=""></button>`).join("");
    $$("[data-photo]", $("#project-thumbs")).forEach((button) => button.addEventListener("click", () => showProjectPhoto(Number(button.dataset.photo))));
    showProjectPhoto(0);
    openDialog($("#project-modal"));
  }

  $$(".project-card[data-project]").forEach((card) => {
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.addEventListener("click", () => openProject(card.dataset.project));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openProject(card.dataset.project); }
    });
  });
  $("[data-gallery-prev]").addEventListener("click", () => showProjectPhoto(activePhoto - 1));
  $("[data-gallery-next]").addEventListener("click", () => showProjectPhoto(activePhoto + 1));
  addEventListener("keydown", (event) => {
    if (!$("#project-modal").open) return;
    if (event.key === "ArrowLeft") showProjectPhoto(activePhoto - 1);
    if (event.key === "ArrowRight") showProjectPhoto(activePhoto + 1);
  });

  const materialCopy = {
    facades: "Матовые, глянцевые и древесные фактуры — стойкие к ежедневному использованию.",
    worktops: "Компакт-плита, кварц и влагостойкие поверхности под характер и нагрузку проекта.",
    hardware: "Петли, направляющие и подъёмные механизмы с плавным ходом и ресурсом на годы.",
  };
  $$(".material-tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".material-tabs button").forEach((item) => item.classList.toggle("active", item === button));
      $("#material-caption").textContent = materialCopy[button.dataset.material];
    });
  });

  function openDialog(dialog) {
    if (!dialog.open) dialog.showModal();
  }
  $$("[data-close]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
  $$("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));
  $$("[data-open-brief]").forEach((button) => button.addEventListener("click", () => openDialog($("#brief-modal"))));
  $$("[data-open-client]").forEach((button) => button.addEventListener("click", () => openDialog($("#client-modal"))));
  $$("[data-open-admin]").forEach((button) => button.addEventListener("click", () => openDialog($("#admin-modal"))));

  // Brief
  const brief = $("#brief-form");
  let briefStep = 1;
  const updateBrief = () => {
    $$(".brief-step", brief).forEach((step) => step.classList.toggle("active", Number(step.dataset.step) === briefStep));
    $(".brief-progress i").style.width = `${briefStep * 25}%`;
    $("[data-prev]", brief).hidden = briefStep === 1;
    $("[data-next]", brief).hidden = briefStep === 4;
    $("[data-submit]", brief).hidden = briefStep !== 4;
  };
  const validateStep = () => {
    const active = $(`.brief-step[data-step="${briefStep}"]`, brief);
    const required = $$("[required]", active);
    const invalid = required.find((input) => {
      if (input.type === "radio") return !$(`input[name="${input.name}"]:checked`, active);
      return !input.value.trim();
    });
    if (invalid) {
      invalid.closest("label")?.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], { duration: 260 });
      return false;
    }
    return true;
  };
  $("[data-next]", brief).addEventListener("click", () => {
    if (validateStep()) { briefStep += 1; updateBrief(); }
  });
  $("[data-prev]", brief).addEventListener("click", () => { briefStep -= 1; updateBrief(); });
  const range = $('input[name="size"]', brief);
  range.addEventListener("input", () => $("output", brief).value = range.value);
  brief.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateStep()) return;
    const form = Object.fromEntries(new FormData(brief));
    const next = Math.max(1042, ...data.orders.map((order) => Number(order.id.replace(/\D/g, "")))) + 1;
    const id = `WL-${next}`;
    const lead = {
      id, client: form.name, phone: form.phone, type: form.type,
      title: `${form.type} · новая заявка`, status: "lead", budget: 0, paid: 0,
      deadline: "", manager: "Не назначен", address: "", note: `${form.budget}; ${form.size} м; ${form.term}. ${form.comment || ""}`.trim(),
      updated: "Только что",
    };
    data.orders.unshift(lead);
    data.leads.unshift({ ...form, id, createdAt: new Date().toISOString() });
    data.tasks.unshift({ id: Date.now(), text: `Связаться с ${form.name} по новой заявке`, orderId: id, due: "В течение 15 минут", done: false });
    saveData();
    $$(".brief-step, .brief-controls", brief).forEach((node) => node.style.display = "none");
    $(".brief-success", brief).classList.add("active");
  });

  // Client login
  $("#client-login").addEventListener("submit", (event) => {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code").trim().toUpperCase();
    const order = data.orders.find((item) => item.id.toUpperCase() === code);
    if (!order) {
      $(".form-error", event.currentTarget).textContent = "Проект с таким кодом не найден. Проверьте код.";
      return;
    }
    $("#client-modal").close();
    renderClientSpace(order);
  });

  // Admin login
  $("#admin-login").addEventListener("submit", (event) => {
    event.preventDefault();
    const pin = new FormData(event.currentTarget).get("pin");
    if (pin !== "1640") {
      $(".form-error", event.currentTarget).textContent = "Неверный PIN. Для демо используйте 1640.";
      return;
    }
    $("#admin-modal").close();
    renderAdmin();
  });

  function workspaceSidebar(role, current = "") {
    if (role === "client") {
      return `
        <aside class="workspace-sidebar">
          <a class="brand" href="#"><svg class="brand-mark" viewBox="0 0 52 52"><path d="M8 24 26 9l18 15v20H8Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17 25h18v19H17zm4 0v19m10-19v19" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><span><strong>Woodlife</strong><small>кабинет клиента</small></span></a>
          <nav class="workspace-nav"><button class="active"><i></i><span>Мой проект</span></button><button><i></i><span>Документы</span></button><button><i></i><span>Связь</span></button></nav>
          <button class="workspace-exit" data-workspace-close>Вернуться на сайт</button>
        </aside>`;
    }
    const nav = [
      ["overview", "Обзор"], ["orders", "Заказы"], ["clients", "Клиенты"], ["tasks", "Задачи"],
    ];
    return `
      <aside class="workspace-sidebar">
        <a class="brand" href="#"><svg class="brand-mark" viewBox="0 0 52 52"><path d="M8 24 26 9l18 15v20H8Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17 25h18v19H17zm4 0v19m10-19v19" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><span><strong>Woodlife</strong><small>управление</small></span></a>
        <nav class="workspace-nav">${nav.map(([id, label]) => `<button data-admin-nav="${id}" class="${id === current ? "active" : ""}"><i></i><span>${label}</span></button>`).join("")}</nav>
        <button class="workspace-exit" data-workspace-close>Выйти из CRM</button>
      </aside>`;
  }

  function bindWorkspaceClose(root) {
    $("[data-workspace-close]", root)?.addEventListener("click", () => {
      root.hidden = true;
      document.body.style.overflow = "";
    });
  }

  function renderClientSpace(order) {
    const root = $("#client-space");
    const currentIndex = STATUS.findIndex((item) => item.id === order.status);
    const status = statusInfo(order.status);
    root.innerHTML = `
      <div class="workspace-shell">
        ${workspaceSidebar("client")}
        <main class="workspace-main client-project">
          <div class="client-hero">
            <p class="eyebrow" style="color:#d9bdce">${esc(order.id)} · личный кабинет</p>
            <h1>${esc(order.title)}</h1>
            <p>${esc(order.client)}, ваш проект на этапе «${status.label}».</p>
            <div class="client-progress"><i style="width:${status.progress}%"></i></div>
          </div>
          <div class="client-grid">
            <section class="workspace-card">
              <div class="card-head"><h2>Путь проекта</h2><span class="status-chip">${status.progress}% готово</span></div>
              <div class="stage-list">
                ${STATUS.slice(0, 8).map((stage, index) => `
                  <article class="stage-item ${index < currentIndex ? "complete" : index === currentIndex ? "current" : ""}">
                    <i>${index < currentIndex ? "✓" : index + 1}</i>
                    <div><h3>${stage.label}</h3><p>${index < currentIndex ? "Этап завершён" : index === currentIndex ? "Сейчас работаем здесь" : "Впереди"}</p></div>
                  </article>`).join("")}
              </div>
            </section>
            <aside>
              <section class="workspace-card">
                <div class="card-head"><h2>О проекте</h2></div>
                <div class="project-info">
                  <div><span>Срок</span><strong>${esc(order.deadline || "Уточняется")}</strong></div>
                  <div><span>Дизайнер</span><strong>${esc(order.manager)}</strong></div>
                  <div><span>Стоимость</span><strong>${money(order.budget)}</strong></div>
                  <div><span>Оплачено</span><strong>${money(order.paid)}</strong></div>
                  <div><span>Адрес</span><strong>${esc(order.address || "Не указан")}</strong></div>
                </div>
              </section>
              <section class="workspace-card" style="margin-top:16px">
                <div class="card-head"><h2>Следующий шаг</h2></div>
                <p style="color:var(--muted);font-size:.8rem;line-height:1.7">${esc(order.note)}</p>
                <a class="primary-button" href="https://t.me/Woodlife164" target="_blank" rel="noreferrer">Написать дизайнеру ↗</a>
              </section>
            </aside>
          </div>
        </main>
      </div>`;
    root.hidden = false;
    document.body.style.overflow = "hidden";
    bindWorkspaceClose(root);
  }

  function adminHeader(title, subtitle, action = true) {
    return `
      <header class="workspace-top">
        <div><h1>${title}</h1><p>${subtitle}</p></div>
        <div class="workspace-actions">${action ? `<button class="primary-button" type="button" data-add-order>+ Новый заказ</button>` : ""}</div>
      </header>`;
  }

  function overviewHtml() {
    const active = data.orders.filter((item) => !["lead", "done"].includes(item.status));
    const revenue = data.orders.reduce((sum, item) => sum + Number(item.budget || 0), 0);
    const debt = data.orders.reduce((sum, item) => sum + Math.max(0, Number(item.budget || 0) - Number(item.paid || 0)), 0);
    const cols = ["lead", "design", "production", "install"];
    return `
      ${adminHeader("Добрый день", "Вся мастерская — на одном экране")}
      <section class="metrics-grid">
        <article class="workspace-card metric"><small>Активные проекты</small><strong>${active.length}</strong><em>в работе сейчас</em></article>
        <article class="workspace-card metric"><small>Портфель заказов</small><strong>${money(revenue)}</strong><em>по всем проектам</em></article>
        <article class="workspace-card metric"><small>К получению</small><strong>${money(debt)}</strong><em>остаток платежей</em></article>
        <article class="workspace-card metric"><small>Задачи сегодня</small><strong>${data.tasks.filter((task) => !task.done).length}</strong><em>требуют внимания</em></article>
      </section>
      <div class="dashboard-grid">
        <section class="workspace-card">
          <div class="card-head"><h2>Производственный поток</h2><button data-admin-nav="orders">Все заказы →</button></div>
          <div class="pipeline">${cols.map((status) => {
            const list = data.orders.filter((order) => order.status === status);
            return `<div class="pipeline-col"><div class="pipeline-head"><span>${statusInfo(status).label}</span><strong>${list.length}</strong></div>${list.length ? list.map(orderCard).join("") : `<div class="empty-state">Пусто</div>`}</div>`;
          }).join("")}</div>
        </section>
        <section class="workspace-card">
          <div class="card-head"><h2>Сегодня</h2><button data-admin-nav="tasks">Все задачи →</button></div>
          <div class="activity-list">${data.tasks.slice(0, 6).map((task) => `<article class="activity-item"><i>${task.done ? "✓" : "!"}</i><div><p>${esc(task.text)}</p><small>${esc(task.orderId)} · ${esc(task.due)}</small></div></article>`).join("")}</div>
        </section>
      </div>`;
  }

  function orderCard(order) {
    return `<article class="order-card" data-edit-order="${esc(order.id)}"><strong>${esc(order.title)}</strong><span>${esc(order.client)} · ${esc(order.id)}</span><small>${money(order.budget)}</small></article>`;
  }

  function ordersHtml() {
    return `
      ${adminHeader("Заказы", `${data.orders.length} проектов в базе`)}
      <section class="workspace-card">
        <div class="card-head"><h2>Все проекты</h2><input id="order-search" placeholder="Поиск по клиенту или коду" style="padding:10px;border:1px solid var(--line);width:min(280px,100%)"></div>
        <div style="overflow:auto"><table class="crm-table"><thead><tr><th>Код</th><th>Проект / клиент</th><th>Этап</th><th>Сумма</th><th>Срок</th><th></th></tr></thead>
        <tbody id="orders-body">${data.orders.map(orderRow).join("")}</tbody></table></div>
      </section>`;
  }

  function orderRow(order) {
    return `<tr data-order-row="${esc((order.id + order.client + order.title).toLowerCase())}"><td><strong>${esc(order.id)}</strong></td><td>${esc(order.title)}<br><small style="color:var(--muted)">${esc(order.client)} · ${esc(order.phone)}</small></td><td><span class="status-chip">${statusInfo(order.status).label}</span></td><td>${money(order.budget)}</td><td>${esc(order.deadline || "—")}</td><td><button class="link-button" data-edit-order="${esc(order.id)}">Открыть</button></td></tr>`;
  }

  function clientsHtml() {
    const clients = [...new Map(data.orders.map((order) => [order.phone, order])).values()];
    return `
      ${adminHeader("Клиенты", `${clients.length} контактов`, false)}
      <section class="workspace-card"><div style="overflow:auto"><table class="crm-table"><thead><tr><th>Клиент</th><th>Телефон</th><th>Последний проект</th><th>Сумма</th><th>Менеджер</th></tr></thead><tbody>
      ${clients.map((client) => `<tr><td><strong>${esc(client.client)}</strong></td><td>${esc(client.phone)}</td><td>${esc(client.title)}</td><td>${money(client.budget)}</td><td>${esc(client.manager)}</td></tr>`).join("")}
      </tbody></table></div></section>`;
  }

  function tasksHtml() {
    return `
      ${adminHeader("Задачи", "Следующие действия команды", false)}
      <section class="workspace-card">
        <form id="task-form" style="display:flex;gap:8px;margin-bottom:22px"><input name="text" required placeholder="Добавить задачу…" style="flex:1;padding:14px;border:1px solid var(--line)"><button class="primary-button">Добавить</button></form>
        <div class="task-list">${data.tasks.map((task) => `<article class="task-item ${task.done ? "done" : ""}"><input type="checkbox" data-task-toggle="${task.id}" ${task.done ? "checked" : ""}><div><strong>${esc(task.text)}</strong><br><small>${esc(task.orderId)} · ${esc(task.due)}</small></div><button class="link-button" data-task-delete="${task.id}">Удалить</button></article>`).join("")}</div>
      </section>`;
  }

  function renderAdmin(section = adminSection) {
    adminSection = section;
    const root = $("#admin-space");
    const content = section === "orders" ? ordersHtml() : section === "clients" ? clientsHtml() : section === "tasks" ? tasksHtml() : overviewHtml();
    root.innerHTML = `<div class="workspace-shell">${workspaceSidebar("admin", section)}<main class="workspace-main">${content}</main></div>`;
    root.hidden = false;
    document.body.style.overflow = "hidden";
    bindWorkspaceClose(root);
    bindAdminEvents(root);
  }

  function bindAdminEvents(root) {
    $$("[data-admin-nav]", root).forEach((button) => button.addEventListener("click", () => renderAdmin(button.dataset.adminNav)));
    $$("[data-add-order]", root).forEach((button) => button.addEventListener("click", () => openOrderEditor()));
    $$("[data-edit-order]", root).forEach((button) => button.addEventListener("click", () => openOrderEditor(data.orders.find((order) => order.id === button.dataset.editOrder))));
    $("#order-search", root)?.addEventListener("input", (event) => {
      const query = event.target.value.trim().toLowerCase();
      $$("[data-order-row]", root).forEach((row) => row.hidden = !row.dataset.orderRow.includes(query));
    });
    $("#task-form", root)?.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = new FormData(event.currentTarget).get("text").trim();
      data.tasks.unshift({ id: Date.now(), text, orderId: "Общее", due: "Без срока", done: false });
      saveData(); renderAdmin("tasks");
    });
    $$("[data-task-toggle]", root).forEach((input) => input.addEventListener("change", () => {
      const task = data.tasks.find((item) => item.id === Number(input.dataset.taskToggle));
      task.done = input.checked; saveData(); renderAdmin("tasks");
    }));
    $$("[data-task-delete]", root).forEach((button) => button.addEventListener("click", () => {
      data.tasks = data.tasks.filter((item) => item.id !== Number(button.dataset.taskDelete));
      saveData(); renderAdmin("tasks");
    }));
  }

  function openOrderEditor(order = null) {
    const editing = Boolean(order);
    const next = Math.max(1042, ...data.orders.map((item) => Number(item.id.replace(/\D/g, "")))) + 1;
    const current = order || { id: `WL-${next}`, client: "", phone: "", type: "Кухня", title: "", status: "lead", budget: 0, paid: 0, deadline: "", manager: "Алексей", address: "", note: "" };
    const dialog = document.createElement("dialog");
    dialog.className = "modal access-modal";
    dialog.innerHTML = `
      <button class="modal-close" type="button">×</button>
      <p class="eyebrow">${editing ? esc(current.id) : "Новый проект"}</p>
      <h2>${editing ? "Карточка заказа" : "Создать заказ"}</h2>
      <form id="order-editor">
        <div class="form-grid">
          <label><span>Клиент</span><input name="client" required value="${esc(current.client)}"></label>
          <label><span>Телефон</span><input name="phone" required value="${esc(current.phone)}"></label>
          <label class="full"><span>Название проекта</span><input name="title" required value="${esc(current.title)}"></label>
          <label><span>Этап</span><select name="status">${STATUS.map((s) => `<option value="${s.id}" ${s.id === current.status ? "selected" : ""}>${s.label}</option>`).join("")}</select></label>
          <label><span>Тип</span><input name="type" value="${esc(current.type)}"></label>
          <label><span>Стоимость</span><input name="budget" type="number" value="${current.budget}"></label>
          <label><span>Оплачено</span><input name="paid" type="number" value="${current.paid}"></label>
          <label><span>Срок</span><input name="deadline" type="date" value="${esc(current.deadline)}"></label>
          <label><span>Дизайнер</span><input name="manager" value="${esc(current.manager)}"></label>
          <label class="full"><span>Адрес</span><input name="address" value="${esc(current.address)}"></label>
          <label class="full"><span>Заметка / следующий шаг</span><textarea name="note">${esc(current.note)}</textarea></label>
        </div>
        <div style="display:flex;gap:8px;justify-content:space-between;margin-top:15px">
          ${editing ? `<button class="secondary-button" type="button" data-delete-order>Удалить</button>` : "<span></span>"}
          <button class="primary-button" type="submit">Сохранить →</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);
    dialog.showModal();
    $(".modal-close", dialog).addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => dialog.remove());
    $("[data-delete-order]", dialog)?.addEventListener("click", () => {
      if (confirm(`Удалить заказ ${current.id}?`)) {
        data.orders = data.orders.filter((item) => item.id !== current.id);
        saveData(); dialog.close(); renderAdmin("orders");
      }
    });
    $("#order-editor", dialog).addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const updated = { ...current, ...values, budget: Number(values.budget), paid: Number(values.paid), updated: "Только что" };
      const index = data.orders.findIndex((item) => item.id === current.id);
      if (index >= 0) data.orders[index] = updated; else data.orders.unshift(updated);
      saveData(); dialog.close(); renderAdmin("orders");
    });
  }
})();
