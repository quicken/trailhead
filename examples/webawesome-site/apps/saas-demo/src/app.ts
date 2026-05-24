/**
 * SaaS Demo — vanilla TypeScript, Web Awesome components, no framework
 */

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: { name: string };
}

export function mountSaasApp(root: HTMLElement): void {
  let users: User[] = [];
  let editingUser: User | null = null;

  // ── Static shell ──────────────────────────────────────────────────────────
  root.innerHTML = `
    <div class="saas-container">
      <header class="saas-header">
        <h1>User Management</h1>
        <p>Manage your application users</p>
      </header>

      <div class="saas-actions">
        <wa-button variant="brand" id="load-btn">
          <wa-icon slot="prefix" name="arrows-rotate"></wa-icon>
          Load Users
        </wa-button>
      </div>

      <div id="users-grid" class="users-grid"></div>

      <wa-dialog id="edit-dialog" label="Edit User">
        <form class="edit-form" id="edit-form">
          <wa-input id="edit-name"    label="Name"></wa-input>
          <wa-input id="edit-email"   label="Email"   type="email"></wa-input>
          <wa-input id="edit-phone"   label="Phone"></wa-input>
          <wa-input id="edit-company" label="Company"></wa-input>
        </form>
        <div slot="footer" class="dialog-footer">
          <wa-button variant="neutral" id="cancel-btn">Cancel</wa-button>
          <wa-button variant="brand"   id="save-btn">Save</wa-button>
        </div>
      </wa-dialog>
    </div>
  `;

  // ── Element refs ──────────────────────────────────────────────────────────
  const loadBtn   = root.querySelector('#load-btn')    as HTMLElement & { disabled: boolean };
  const grid      = root.querySelector('#users-grid')  as HTMLElement;
  const dialog    = root.querySelector('#edit-dialog') as HTMLElement & { show(): void; hide(): void };
  const cancelBtn = root.querySelector('#cancel-btn')  as HTMLElement;
  const saveBtn   = root.querySelector('#save-btn')    as HTMLElement;
  const nameInput    = root.querySelector('#edit-name')    as HTMLInputElement;
  const emailInput   = root.querySelector('#edit-email')   as HTMLInputElement;
  const phoneInput   = root.querySelector('#edit-phone')   as HTMLInputElement;
  const companyInput = root.querySelector('#edit-company') as HTMLInputElement;

  // ── Render users grid ─────────────────────────────────────────────────────
  function renderUsers(): void {
    if (users.length === 0) {
      grid.innerHTML = `
        <wa-card class="empty-card">
          <div class="empty-state">
            <wa-icon name="users" class="empty-icon"></wa-icon>
            <p>No users loaded. Click 'Load Users' to get started.</p>
          </div>
        </wa-card>
      `;
      return;
    }

    grid.innerHTML = users.map(u => `
      <wa-card data-id="${u.id}" class="user-card">
        <div class="card-content">
          <div class="user-info">
            <h3 class="user-name">${escHtml(u.name)}</h3>
            <p class="user-detail"><wa-icon name="envelope"></wa-icon>${escHtml(u.email)}</p>
            <p class="user-detail"><wa-icon name="phone"></wa-icon>${escHtml(u.phone)}</p>
            <p class="user-detail"><wa-icon name="building"></wa-icon>${escHtml(u.company.name)}</p>
          </div>
          <div class="card-actions">
            <wa-button size="small" variant="neutral" data-action="edit"   data-id="${u.id}">
              <wa-icon name="pencil"></wa-icon>
            </wa-button>
            <wa-button size="small" variant="danger"  data-action="delete" data-id="${u.id}">
              <wa-icon name="trash"></wa-icon>
            </wa-button>
          </div>
        </div>
      </wa-card>
    `).join('');
  }

  // ── Load users ────────────────────────────────────────────────────────────
  async function loadUsers(): Promise<void> {
    loadBtn.disabled = true;
    window.shell.feedback.busy('Loading users…');

    const result = await window.shell.http.get<User[]>('https://jsonplaceholder.typicode.com/users');

    window.shell.feedback.clear();
    loadBtn.disabled = false;

    if (result.success) {
      users = result.data;
      window.shell.feedback.success('Users loaded successfully');
    } else {
      window.shell.feedback.error('Failed to load users');
    }

    renderUsers();
  }

  // ── Open edit dialog ──────────────────────────────────────────────────────
  function openEdit(id: number): void {
    const user = users.find(u => u.id === id);
    if (!user) return;
    editingUser = user;
    nameInput.value    = user.name;
    emailInput.value   = user.email;
    phoneInput.value   = user.phone;
    companyInput.value = user.company.name;
    dialog.show();
  }

  // ── Save edit ─────────────────────────────────────────────────────────────
  function saveEdit(): void {
    if (!editingUser) return;
    editingUser = {
      ...editingUser,
      name:    nameInput.value,
      email:   emailInput.value,
      phone:   phoneInput.value,
      company: { name: companyInput.value },
    };
    users = users.map(u => u.id === editingUser!.id ? editingUser! : u);
    window.shell.feedback.success('User updated successfully');
    dialog.hide();
    editingUser = null;
    renderUsers();
  }

  // ── Delete user ───────────────────────────────────────────────────────────
  async function deleteUser(id: number): Promise<void> {
    const user = users.find(u => u.id === id);
    if (!user) return;

    const confirmed = await window.shell.feedback.confirm(
      `Are you sure you want to delete ${user.name}?`,
      'Delete User'
    );
    if (!confirmed) return;

    window.shell.feedback.busy('Deleting user…');
    const result = await window.shell.http.delete(`https://jsonplaceholder.typicode.com/users/${id}`);
    window.shell.feedback.clear();

    if (result.success) {
      users = users.filter(u => u.id !== id);
      window.shell.feedback.success('User deleted successfully');
    } else {
      window.shell.feedback.error('Failed to delete user');
    }

    renderUsers();
  }

  // ── Event wiring ──────────────────────────────────────────────────────────
  loadBtn.addEventListener('click', loadUsers);
  cancelBtn.addEventListener('click', () => dialog.hide());
  saveBtn.addEventListener('click', saveEdit);

  // Event delegation for card edit/delete buttons
  grid.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!btn) return;
    const id = parseInt(btn.dataset['id'] ?? '', 10);
    if (btn.dataset['action'] === 'edit')   openEdit(id);
    if (btn.dataset['action'] === 'delete') deleteUser(id);
  });

  // Initial render (empty state)
  renderUsers();
}

// ── Utility ───────────────────────────────────────────────────────────────
function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
