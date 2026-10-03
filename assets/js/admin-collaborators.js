import { supabaseClient } from "./supabase-client.js";
import { showFeedbackPopup } from "./feedback.js";

const tableName = "collaborators";
const bucketName = "collaborator-logos";
const state = { items: [], user: null, previewUrl: "" };

document.addEventListener("DOMContentLoaded", async function () {
    bindLogout();
    if (!(await guardAdmin())) return;
    bindEvents();
    await loadItems();
});

function bindEvents() {
    document.querySelector("[data-collaborator-refresh]").addEventListener("click", loadItems);
    document.querySelector("[data-collaborator-new]").addEventListener("click", function () { openForm(); });
    document.querySelector("[data-form-close]").addEventListener("click", closeForm);
    document.querySelector("[data-form-cancel]").addEventListener("click", closeForm);
    document.querySelector("[data-collaborator-form]").addEventListener("submit", saveItem);
    document.querySelector("[data-collaborator-list]").addEventListener("click", handleAction);
    document.querySelector("[name=logo_file]").addEventListener("change", previewLogo);
}

async function guardAdmin() {
    const session = await supabaseClient.auth.getSession();
    const user = session.data?.session?.user;
    if (session.error || !user) { window.location.replace("/admin-login.html"); return false; }
    const result = await supabaseClient.from("admin_users").select("id,user_id").eq("user_id", user.id).maybeSingle();
    if (result.error || !result.data) { await supabaseClient.auth.signOut(); window.location.replace("/admin-login.html"); return false; }
    state.user = user;
    return true;
}

function bindLogout() {
    document.querySelector("[data-admin-logout]").addEventListener("click", async function () { await supabaseClient.auth.signOut(); window.location.replace("/admin-login.html"); });
}

async function loadItems() {
    setStatus("[data-collaborator-status]", "Loading collaborators...", "info");
    const result = await supabaseClient.from(tableName).select("*").order("display_order").order("name");
    if (result.error) { setStatus("[data-collaborator-status]", result.error.message, "error"); return; }
    state.items = result.data || [];
    renderItems();
    document.querySelector("[data-count-all]").textContent = state.items.length;
    document.querySelector("[data-count-published]").textContent = state.items.filter(function (item) { return item.is_published; }).length;
    document.querySelector("[data-count-draft]").textContent = state.items.filter(function (item) { return !item.is_published; }).length;
    setStatus("[data-collaborator-status]", "Loaded " + state.items.length + " collaborators.", "success");
}

function renderItems() {
    const list = document.querySelector("[data-collaborator-list]");
    if (!state.items.length) { list.innerHTML = '<div class="admin-team-empty"><h3>No collaborators yet</h3><p>Add the first collaborator.</p></div>'; return; }
    list.innerHTML = state.items.map(function (item) {
        return '<article class="admin-team-card"><div class="admin-team-card-photo"><img src="' + esc(item.logo_url) + '" alt="' + esc(item.name) + '"></div><div class="admin-team-card-body"><div class="admin-team-card-heading"><div><h3>' + html(item.name) + '</h3><p>' + html(item.website_url || "No website") + '</p></div><span class="admin-status-pill ' + (item.is_published ? "admin-status-published" : "admin-status-draft") + '">' + (item.is_published ? "Published" : "Draft") + '</span></div><span class="admin-team-order">Display order: ' + Number(item.display_order || 0) + '</span><div class="admin-row-actions admin-team-actions"><button class="btn btn-outline" data-edit="' + item.id + '">Edit</button><button class="btn btn-outline admin-danger" data-delete="' + item.id + '">Delete</button></div></div></article>';
    }).join("");
}

function handleAction(event) {
    const edit = event.target.closest("[data-edit]");
    const remove = event.target.closest("[data-delete]");
    if (edit) openForm(state.items.find(function (item) { return item.id === edit.dataset.edit; }));
    if (remove) deleteItem(remove.dataset.delete);
}

function openForm(item) {
    const form = document.querySelector("[data-collaborator-form]");
    form.reset();
    form.elements.id.value = item?.id || "";
    form.elements.name.value = item?.name || "";
    form.elements.website_url.value = item?.website_url || "";
    form.elements.logo_url.value = item?.logo_url || "";
    form.elements.logo_path.value = item?.logo_path || "";
    form.elements.display_order.value = item?.display_order ?? state.items.length + 1;
    form.elements.is_published.checked = item?.is_published || false;
    renderPreview(item?.logo_url || "");
    document.querySelector("[data-form-title]").textContent = item ? "Edit Collaborator" : "Add Collaborator";
    document.querySelector("[data-collaborator-list-panel]").hidden = true;
    document.querySelector("[data-collaborator-form-panel]").hidden = false;
}

function closeForm() {
    clearPreview();
    document.querySelector("[data-collaborator-form-panel]").hidden = true;
    document.querySelector("[data-collaborator-list-panel]").hidden = false;
}

function previewLogo(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) { event.target.value = ""; setStatus("[data-form-status]", "Choose a PNG, JPG or WebP under 5 MB.", "error"); return; }
    clearPreview();
    state.previewUrl = URL.createObjectURL(file);
    renderPreview(state.previewUrl);
}

function renderPreview(url) {
    document.querySelector("[data-logo-preview]").innerHTML = url ? '<img src="' + esc(url) + '" alt="Logo preview">' : '<i class="bx bx-image"></i>';
}
function clearPreview() { if (state.previewUrl) URL.revokeObjectURL(state.previewUrl); state.previewUrl = ""; }

async function saveItem(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.querySelector("[data-form-status]");
    const file = form.elements.logo_file.files[0];
    let logoUrl = form.elements.logo_url.value;
    let logoPath = form.elements.logo_path.value;
    setStatus(status, "Saving collaborator...", "info");
    try {
        if (file) {
            const ext = file.name.split(".").pop().toLowerCase();
            const path = "logos/" + Date.now() + "-" + slugify(form.elements.name.value) + "." + ext;
            const upload = await supabaseClient.storage.from(bucketName).upload(path, file, { contentType: file.type });
            if (upload.error) throw upload.error;
            logoPath = path;
            logoUrl = supabaseClient.storage.from(bucketName).getPublicUrl(path).data.publicUrl;
        }
        if (!logoUrl) throw new Error("Please upload a logo.");
        const payload = { name: form.elements.name.value.trim(), website_url: form.elements.website_url.value.trim() || null, logo_url: logoUrl, logo_path: logoPath || null, display_order: Number(form.elements.display_order.value) || 0, is_published: form.elements.is_published.checked, created_by: state.user.id };
        const id = form.elements.id.value;
        const result = id ? await supabaseClient.from(tableName).update(payload).eq("id", id) : await supabaseClient.from(tableName).insert(payload);
        if (result.error) throw result.error;
        closeForm();
        await loadItems();
    } catch (error) { setStatus(status, error.message || "Could not save collaborator.", "error"); }
}

async function deleteItem(id) {
    const item = state.items.find(function (value) { return value.id === id; });
    if (!item || !window.confirm("Delete " + item.name + "?")) return;
    const result = await supabaseClient.from(tableName).delete().eq("id", id);
    if (result.error) { setStatus("[data-collaborator-status]", result.error.message, "error"); return; }
    if (item.logo_path) await supabaseClient.storage.from(bucketName).remove([item.logo_path]);
    await loadItems();
}

function slugify(value) { return String(value || "logo").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "logo"; }
function setStatus(target, message, type) { const element = typeof target === "string" ? document.querySelector(target) : target; showFeedbackPopup(element, message, type); }
function html(value) { return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function esc(value) { return html(value); }