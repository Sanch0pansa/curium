const app = document.getElementById("app");

const fetchJson = async (url, options) => (await fetch(url, options)).json();

const escapeHtml = (text) =>
  text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

const percent = ({ done, total }) => (total ? Math.round((done / total) * 100) : 0);

const checks = (lesson) =>
  [lesson.is_read, lesson.is_examinated, lesson.practice_completed].filter((value) => value !== null);

const level = (lesson) => {
  const values = checks(lesson);
  return values.every(Boolean) ? 2 : values.some(Boolean) ? 1 : 0;
};

const pad = (number) => String(number + 1).padStart(2, "0");

const THEMES = [["light", "светлая"], ["dark", "тёмная"]];

const currentTheme = () =>
  localStorage.getItem("theme") ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
};

applyTheme(currentTheme());

function showTop(courseId) {
  const theme = currentTheme();
  const buttons = THEMES.map(
    ([key, label]) => `<button data-theme="${key}" class="${key === theme ? "active" : ""}">${label}</button>`,
  );
  document.getElementById("top").innerHTML = `
    <div class="crumbs">
      <a class="logo" href="#/">
        <span class="logo-mark">Cm<small>96</small></span>curium
      </a>
      ${courseId ? `<span class="faint">/</span><span class="muted">${escapeHtml(courseId)}</span>` : ""}
    </div>
    <div class="themes">${buttons.join("")}</div>`;
}

document.getElementById("top").addEventListener("click", (event) => {
  const theme = event.target.dataset.theme;
  if (!theme) return;
  localStorage.setItem("theme", theme);
  applyTheme(theme);
  route();
});

const mark = (value) => `<i class="${value === null ? "none" : value ? "done" : ""}"></i>`;

function renderContent(element, courseId) {
  const lessonsUrl = new URL(`/files/${courseId}/lessons/`, location.origin);
  element.querySelectorAll("img").forEach((image) => {
    image.src = new URL(image.getAttribute("src"), lessonsUrl).href;
  });
  element.querySelectorAll(".math").forEach((node) => {
    katex.render(node.textContent, node, {
      displayMode: node.classList.contains("block"),
      throwOnError: false,
    });
  });
  mermaid.initialize({ startOnLoad: false, theme: currentTheme() === "dark" ? "dark" : "default" });
  mermaid.run({ nodes: element.querySelectorAll(".mermaid") });
}

async function showCourses() {
  showTop();
  const courses = await fetchJson("/api/courses");
  const cards = courses.map((course) => {
    const next = course.lessons.findIndex((lesson) => !lesson.is_read);
    const segs = course.lessons.map((lesson) => `<i class="l${level(lesson)}"></i>`);
    return `
      <a class="card" href="#/course/${course.id}">
        <div class="card-head mono"><span>${escapeHtml(course.id)}</span><span>${course.lessons.length} ур.</span></div>
        <h2>${escapeHtml(course.title)}</h2>
        <p>${escapeHtml(course.goal)}</p>
        <div class="segs">${segs.join("")}</div>
        <div class="card-foot mono">
          <span>${next < 0 ? "всё прочитано" : `урок ${next + 1}`}</span><b>${percent(course)}%</b>
        </div>
      </a>`;
  });
  app.innerHTML = `
    <main class="courses">
      <div class="courses-head">
        <h1 class="title">Курсы</h1>
        <span class="mono faint">новый курс — через агента: «хочу освоить …»</span>
      </div>
      ${cards.length ? `<div class="grid">${cards.join("")}</div>` : '<p class="muted">Курсов пока нет.</p>'}
      <div class="legend mono">
        <span><i style="background: var(--accent)"></i>урок закрыт</span>
        <span><i style="background: var(--partial)"></i>в процессе</span>
        <span><i style="background: var(--empty)"></i>не начат</span>
      </div>
    </main>`;
}

function sidebarHtml(courseId, course, current) {
  const items = course.lessons.map((lesson, number) => `
    <li>
      <a href="#/course/${courseId}/${number}" class="${number === current ? "active" : ""} ${lesson.is_read ? "read" : ""}">
        <span class="num">${pad(number)}</span>
        <span class="name">${escapeHtml(lesson.title)}</span>
        <span class="marks">${mark(lesson.is_read)}${mark(lesson.is_examinated)}${mark(lesson.practice_completed)}</span>
      </a>
    </li>`);
  return `
    <aside>
      <div class="aside-head">
        <a class="back mono" href="#/">← все курсы</a>
        <h2>${escapeHtml(course.title)}</h2>
        <span class="mono">${course.done} / ${course.total} проверок · ${percent(course)}%</span>
      </div>
      <div class="cols"><span>чт</span><span>эк</span><span>пр</span></div>
      <ol>${items.join("")}</ol>
    </aside>`;
}

const examHtml = (lesson, command) => `
  <section class="block">
    <i class="${lesson.is_examinated ? "done" : ""}"></i>
    <div class="block-head"><h2>Экзамен</h2><span class="mono">${lesson.is_examinated ? "сдан" : "не сдан"}</span></div>
    <div class="block-body">
      <p>Скажите агенту в чате — он задаст вопросы урока и сам отметит результат.</p>
      <div class="command"><span>${escapeHtml(command)}</span><button class="copy" id="copy">копировать</button></div>
    </div>
  </section>`;

const practiceHtml = (lesson, practice) => `
  <section class="block">
    <i class="${lesson.practice_completed ? "done" : ""}"></i>
    <div class="block-head"><h2>Практика</h2><span class="mono">${lesson.practice_completed ? "принята" : "ожидает решения"}</span></div>
    <div class="block-body">
      <div class="practice">${practice}</div>
      <p class="muted">Готовое решение отправьте агенту на проверку.</p>
    </div>
  </section>`;

const afterReadHtml = (lesson, practice, command, nextHref) => `
  <div class="read-done">
    <span><i></i>Прочитано</span>
    <button id="unread">отменить</button>
  </div>
  ${lesson.is_examinated !== null || practice !== null ? '<div class="hint mono">// дальше — у агента</div>' : ""}
  ${lesson.is_examinated !== null ? examHtml(lesson, command) : ""}
  ${practice !== null ? practiceHtml(lesson, practice) : ""}
  ${nextHref ? `<a class="next" href="${nextHref}">Следующий урок →</a>` : ""}`;

const footerHtml = (lesson, practice, command, nextHref) =>
  lesson.is_read
    ? afterReadHtml(lesson, practice, command, nextHref)
    : '<button class="read" id="read">Отметить как прочитанное</button>';

const firstUnread = (course) => Math.max(course.lessons.findIndex((lesson) => !lesson.is_read), 0);

async function setRead(courseId, number, isRead) {
  await fetch(`/api/courses/${courseId}/lessons/${number}/read`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_read: isRead }),
  });
  showCourse(courseId, number);
}

async function showCourse(courseId, requested) {
  showTop(courseId);
  const course = await fetchJson(`/api/courses/${courseId}`);
  const number = requested ?? firstUnread(course);
  const lesson = course.lessons[number];
  const nextHref = number + 1 < course.lessons.length ? `#/course/${courseId}/${number + 1}` : null;
  const command = `Проэкзаменуй меня по уроку ${number + 1} курса ${courseId}`;
  const { body, practice } = await fetchJson(`/api/courses/${courseId}/lessons/${number}`);

  app.innerHTML = `
    <div class="layout">
      ${sidebarHtml(courseId, course, number)}
      <main class="lesson">
        <div class="lesson-meta mono">
          <span>${escapeHtml(lesson.file)}</span>
          <span>урок ${number + 1} из ${course.lessons.length} · ~8 мин</span>
        </div>
        <article>${body}</article>
        <div id="footer">${footerHtml(lesson, practice, command, nextHref)}</div>
      </main>
    </div>`;

  renderContent(app, courseId);
  const list = app.querySelector("aside ol");
  const items = list.children;
  const first = items[number];
  const last = items[Math.min(number + 1, items.length - 1)];
  list.scrollTop = Math.max(Math.min(list.scrollTop, first.offsetTop - list.offsetTop), last.offsetTop + last.offsetHeight - list.offsetTop - list.clientHeight);
  document.getElementById("read")?.addEventListener("click", () => setRead(courseId, number, true));
  document.getElementById("unread")?.addEventListener("click", () => setRead(courseId, number, false));
  document.getElementById("copy")?.addEventListener("click", (event) => {
    navigator.clipboard?.writeText(command);
    event.target.textContent = "скопировано";
  });
  scrollTo(0, 0);
}

function route() {
  const [page, courseId, number] = location.hash.slice(2).split("/");
  if (page === "course") {
    showCourse(courseId, number && Number(number));
  } else {
    showCourses();
  }
}

addEventListener("hashchange", route);
route();
