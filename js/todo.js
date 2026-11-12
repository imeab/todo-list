// ===== 1. 요소 가져오기 =====
const form = document.getElementById("todo-form");
const dateInput = document.getElementById("todo-date");
const titleInput = document.getElementById("todo-title");
const contentInput = document.getElementById("todo-content");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");

const list = document.getElementById("todo-list");
const count = document.getElementById("todo-count");
const filterButtons = document.querySelectorAll(".filter-btn");
const sortSelect = document.getElementById("sort-select");

const trashDialog = document.getElementById("trash-dialog");
const trashList = document.getElementById("trash-list");
const trashCount = document.getElementById("trash-count");

// ===== 2. 데이터 =====
// 할 일 하나 = { id, date, title, content, done }
let todos = JSON.parse(localStorage.getItem("todos")) || [];
let trash = JSON.parse(localStorage.getItem("trash")) || []; // 삭제한 할 일
let currentFilter = "all"; // all, active, done
let editingId = null; // 수정 중인 할 일 id (없으면 null = 등록 모드)

function save() {
    localStorage.setItem("todos", JSON.stringify(todos));
    localStorage.setItem("trash", JSON.stringify(trash));
}

// 오늘 날짜를 기본값으로
function today() {
    return new Date().toISOString().slice(0, 10);
}
dateInput.value = today();

// ===== 3. 카드 하나 만들기 =====
// innerHTML 대신 createElement + textContent 사용 (입력한 글자가 태그로 실행되지 않게)
function createCard(todo) {
    const li = document.createElement("li");
    li.className = todo.done ? "card done" : "card";
    li.dataset.id = todo.id;

    const head = document.createElement("div");
    head.className = "card-head";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "check";
    check.checked = todo.done;
    check.setAttribute("aria-label", "완료");

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = todo.title;

    head.append(check, title);

    const date = document.createElement("span");
    date.className = "card-date";
    date.textContent = todo.date;

    const content = document.createElement("p");
    content.className = "card-content";
    content.textContent = todo.content;

    const buttons = document.createElement("div");
    buttons.className = "card-buttons";
    buttons.innerHTML = `
        <button type="button" class="edit-btn">수정</button>
        <button type="button" class="delete-btn">삭제</button>`;

    li.append(head, date, content, buttons);
    return li;
}

// ===== 4. 목록 그리기 (조회) =====
function render() {
    // 1) 필터
    let result = todos.filter(function (todo) {
        if (currentFilter === "active") return !todo.done;
        if (currentFilter === "done") return todo.done;
        return true;
    });

    // 2) 정렬 (원본 todos는 그대로 두려고 [...result]로 복사해서 정렬)
    if (sortSelect.value === "date") {
        result = [...result].sort((a, b) => a.date.localeCompare(b.date));
    } else {
        result = [...result].sort((a, b) => b.id - a.id); // 최근 등록이 위로
    }

    // 3) 화면에 그리기
    list.innerHTML = "";
    if (result.length === 0) {
        list.innerHTML = '<li class="empty">할 일이 없습니다</li>';
    } else {
        result.map(createCard).forEach((card) => list.appendChild(card));
    }

    const leftCount = todos.filter((todo) => !todo.done).length;
    count.textContent = `남은 할 일 ${leftCount}개 / 전체 ${todos.length}개`;
    trashCount.textContent = trash.length;
}

// ===== 5. 등록 / 수정 =====
form.addEventListener("submit", function (e) {
    e.preventDefault();

    const date = dateInput.value;
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!date) {
        alert("날짜를 선택해주세요!");
        dateInput.focus();
        return;
    }
    if (!title) {
        alert("제목을 입력해주세요!");
        titleInput.focus();
        return;
    }

    if (editingId === null) {
        // 등록: id는 지금 있는 id(휴지통 포함) 중 가장 큰 값 + 1
        const allIds = [...todos, ...trash].map((todo) => todo.id);
        const newId = allIds.length === 0 ? 1 : Math.max(...allIds) + 1;

        todos.push({ id: newId, date, title, content, done: false });
    } else {
        // 수정: 같은 id만 새 내용으로 바꾸기
        todos = todos.map((todo) =>
            todo.id === editingId ? { ...todo, date, title, content } : todo
        );
    }

    save();
    resetForm();
    render();
});

// 폼을 등록 모드로 되돌리기
function resetForm() {
    editingId = null;
    form.reset();
    dateInput.value = today();
    formTitle.textContent = "할 일 등록";
    submitBtn.textContent = "등록하기";
    cancelBtn.classList.add("hidden");
}

cancelBtn.addEventListener("click", resetForm);

// ===== 6. 카드 버튼 (수정 / 삭제 / 완료) - 이벤트 위임 =====
list.addEventListener("click", function (e) {
    const card = e.target.closest(".card");
    if (!card) return;

    const id = Number(card.dataset.id);
    const todo = todos.find((t) => t.id === id);

    // 수정: 폼에 내용 채우고 수정 모드로
    if (e.target.classList.contains("edit-btn")) {
        editingId = id;
        dateInput.value = todo.date;
        titleInput.value = todo.title;
        contentInput.value = todo.content;
        formTitle.textContent = "할 일 수정";
        submitBtn.textContent = "수정하기";
        cancelBtn.classList.remove("hidden");
        titleInput.focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }

    // 삭제: 휴지통으로 이동
    if (e.target.classList.contains("delete-btn")) {
        if (!confirm("휴지통으로 이동할까요?")) return;
        todos = todos.filter((t) => t.id !== id);
        trash.push(todo);
        if (editingId === id) resetForm(); // 수정 중이던 걸 지우면 폼 초기화
    }

    // 완료 체크
    if (e.target.classList.contains("check")) {
        todos = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    }

    save();
    render();
});

// ===== 7. 필터 / 정렬 =====
filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
        filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        render();
    });
});

sortSelect.addEventListener("change", render);

// ===== 8. 휴지통 =====
function renderTrash() {
    trashList.innerHTML = "";

    if (trash.length === 0) {
        trashList.innerHTML = "<li>휴지통이 비어 있습니다</li>";
        return;
    }

    trash.forEach(function (todo) {
        const li = document.createElement("li");
        li.className = "trash-item";
        li.dataset.id = todo.id;

        const text = document.createElement("span");
        text.textContent = `${todo.date} ${todo.title}`;

        const restoreBtn = document.createElement("button");
        restoreBtn.type = "button";
        restoreBtn.className = "restore-btn";
        restoreBtn.textContent = "복구";

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "remove-btn";
        removeBtn.textContent = "영구 삭제";

        li.append(text, restoreBtn, removeBtn);
        trashList.appendChild(li);
    });
}

document.getElementById("trash-open").addEventListener("click", function () {
    renderTrash();
    trashDialog.showModal();
});

document.getElementById("trash-close").addEventListener("click", function () {
    trashDialog.close();
});

trashList.addEventListener("click", function (e) {
    const item = e.target.closest(".trash-item");
    if (!item) return;

    const id = Number(item.dataset.id);

    if (e.target.classList.contains("restore-btn")) {
        const todo = trash.find((t) => t.id === id);
        trash = trash.filter((t) => t.id !== id);
        todos.push(todo);
    }

    if (e.target.classList.contains("remove-btn")) {
        if (!confirm("영구 삭제하면 되돌릴 수 없어요. 삭제할까요?")) return;
        trash = trash.filter((t) => t.id !== id);
    }

    save();
    renderTrash();
    render();
});

// 처음 화면 그리기
render();
