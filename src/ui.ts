// JavaScript代码
// 获取按钮和悬浮窗口元素
const showFloatingBtn = document.getElementById("show-floating-btn");
const floatingWindow = document.getElementById("floating-window");
const closeFloatingBtn = document.getElementById("close-floating-btn");

// 当点击按钮时，显示悬浮窗口
showFloatingBtn.addEventListener("click", () => {
    floatingWindow.style.display = "block";
});

// 当点击关闭按钮时，隐藏悬浮窗口
closeFloatingBtn.addEventListener("click", () => {
    floatingWindow.style.display = "none";
});
