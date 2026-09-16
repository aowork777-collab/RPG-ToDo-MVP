export function el(tag, className = "", content = "") {
  const node = document.createElement(tag); node.className = className;
  if (content !== "") node.textContent = String(content);
  return node;
}
export function button(label, action, className = "hub-button") {
  const node = el("button", className, label); node.type = "button";
  if (action) node.addEventListener("click", event => {
    try { Promise.resolve(action(event)).catch(error => notice(error.message || "操作を完了できませんでした。", "error")); }
    catch (error) { notice(error.message || "操作を完了できませんでした。", "error"); }
  });
  return node;
}
export function link(label, href, className = "hub-button") { const node = el("a", className, label); node.href = href; return node; }
export function field(label, name, value = "", options = {}) {
  const wrapper = el("label", "hub-field"); wrapper.append(el("span", "", label));
  const input = el(options.multiline ? "textarea" : "input"); input.name = name; input.value = value;
  if (!options.multiline) input.type = options.type || "text";
  if (options.max) input.maxLength = options.max;
  if (options.required) input.required = true;
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.autocomplete) input.autocomplete = options.autocomplete;
  wrapper.append(input); return wrapper;
}
export function selectField(label, name, options, selected) {
  const wrapper = el("label", "hub-field"); wrapper.append(el("span", "", label));
  const select = el("select"); select.name = name;
  for (const [value, text] of options) { const option = el("option", "", text); option.value = value; option.selected = String(value) === String(selected); select.append(option); }
  wrapper.append(select); return wrapper;
}
export function panel(title, description = "") {
  const node = el("section", "hub-panel"); node.append(el("h2", "", title));
  if (description) node.append(el("p", "muted", description));
  return node;
}
export function submit(label) { const node = button(label, null, "hub-button primary"); node.type = "submit"; return node; }
export function empty(title, detail) { const node = el("div", "hub-empty"); node.append(el("strong", "", title), el("p", "muted", detail)); return node; }
export function notice(message, type = "success") {
  const root = document.getElementById("hubNotice");
  if (root) { root.textContent = message; root.className = `hub-notice ${type}`; root.hidden = false; }
}
export async function run(buttonNode, operation) {
  if (buttonNode.disabled) return;
  buttonNode.disabled = true;
  try { return await operation(); } catch (error) { notice(error.message || "操作を完了できませんでした。もう一度お試しください。", "error"); }
  finally { buttonNode.disabled = false; }
}
