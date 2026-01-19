import React, { useState, useRef } from "react";
import { t } from "./lib/i18n";

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: {
    name: string;
  };
}

/**
 * SaaS Demo Application
 * Demonstrates a simple user management interface
 */
export const SaasApp: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const dialogRef = useRef<any>(null);

  const loadUsers = async () => {
    setLoading(true);
    window.shell.feedback.busy(t("Loading users..."));

    const result = await window.shell.http.get<User[]>("https://jsonplaceholder.typicode.com/users");

    window.shell.feedback.clear();
    setLoading(false);

    if (result.success) {
      setUsers(result.data);
      window.shell.feedback.success(t("Users loaded successfully"));
    } else {
      window.shell.feedback.error(t("Failed to load users"));
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    dialogRef.current?.show();
  };

  const closeEditDialog = () => {
    dialogRef.current?.hide();
    setEditingUser(null);
  };

  const saveUser = () => {
    if (!editingUser) return;

    // Update user in list
    setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
    window.shell.feedback.success(t("User updated successfully"));
    closeEditDialog();
  };

  const deleteUser = async (id: number, name: string) => {
    const confirmed = await window.shell.feedback.confirm(
      t("Are you sure you want to delete") + ` ${name}?`,
      t("Delete User")
    );

    if (!confirmed) return;

    window.shell.feedback.busy(t("Deleting user..."));

    const result = await window.shell.http.delete(`https://jsonplaceholder.typicode.com/users/${id}`);

    window.shell.feedback.clear();

    if (result.success) {
      setUsers(users.filter(u => u.id !== id));
      window.shell.feedback.success(t("User deleted successfully"));
    } else {
      window.shell.feedback.error(t("Failed to delete user"));
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{t("User Management")}</h1>
        <p style={styles.subtitle}>
          {t("Manage your application users")}
        </p>
      </div>

      <div style={styles.actions}>
        <sl-button variant="primary" onClick={loadUsers} disabled={loading}>
          <sl-icon slot="prefix" name="arrow-clockwise"></sl-icon>
          {t("Load Users")}
        </sl-button>
      </div>

      {users.length > 0 && (
        <div style={styles.grid}>
          {users.map((user) => (
            <sl-card key={user.id}>
              <div style={styles.cardContent}>
                <div style={styles.userInfo}>
                  <h3 style={styles.userName}>{user.name}</h3>
                  <p style={styles.userDetail}>
                    <sl-icon name="envelope"></sl-icon> {user.email}
                  </p>
                  <p style={styles.userDetail}>
                    <sl-icon name="telephone"></sl-icon> {user.phone}
                  </p>
                  <p style={styles.userDetail}>
                    <sl-icon name="building"></sl-icon> {user.company.name}
                  </p>
                </div>
                <div style={styles.cardActions}>
                  <sl-button 
                    size="small" 
                    variant="default"
                    onClick={() => openEditDialog(user)}
                  >
                    <sl-icon name="pencil"></sl-icon>
                  </sl-button>
                  <sl-button 
                    size="small" 
                    variant="danger"
                    onClick={() => deleteUser(user.id, user.name)}
                  >
                    <sl-icon name="trash"></sl-icon>
                  </sl-button>
                </div>
              </div>
            </sl-card>
          ))}
        </div>
      )}

      {users.length === 0 && !loading && (
        <sl-card>
          <div style={styles.emptyState}>
            <sl-icon name="people" style={styles.emptyIcon}></sl-icon>
            <p>{t("No users loaded. Click 'Load Users' to get started.")}</p>
          </div>
        </sl-card>
      )}

      {/* Edit Dialog */}
      <sl-dialog ref={dialogRef} label={t("Edit User")}>
        {editingUser && (
          <div style={styles.form}>
            <sl-input
              label={t("Name")}
              value={editingUser.name}
              onInput={(e: any) => setEditingUser({...editingUser, name: e.target.value})}
            />
            <sl-input
              label={t("Email")}
              type="email"
              value={editingUser.email}
              onInput={(e: any) => setEditingUser({...editingUser, email: e.target.value})}
            />
            <sl-input
              label={t("Phone")}
              value={editingUser.phone}
              onInput={(e: any) => setEditingUser({...editingUser, phone: e.target.value})}
            />
            <sl-input
              label={t("Company")}
              value={editingUser.company.name}
              onInput={(e: any) => setEditingUser({...editingUser, company: {...editingUser.company, name: e.target.value}})}
            />
          </div>
        )}
        <div slot="footer" style={styles.dialogFooter}>
          <sl-button variant="default" onClick={closeEditDialog}>
            {t("Cancel")}
          </sl-button>
          <sl-button variant="primary" onClick={saveUser}>
            {t("Save")}
          </sl-button>
        </div>
      </sl-dialog>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "2rem",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "2rem",
  },
  title: {
    marginBottom: "0.5rem",
    fontSize: "2rem",
    fontWeight: "600",
    color: "#1e293b",
  },
  subtitle: {
    color: "#64748b",
    fontSize: "1rem",
  },
  actions: {
    marginBottom: "2rem",
  },
  grid: {
    display: "grid",
    gap: "1rem",
  },
  cardContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    margin: "0 0 0.5rem 0",
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1e293b",
  },
  userDetail: {
    margin: "0 0 0.25rem 0",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  cardActions: {
    display: "flex",
    gap: "0.5rem",
  },
  emptyState: {
    textAlign: "center",
    padding: "2rem",
    color: "#64748b",
  },
  emptyIcon: {
    fontSize: "3rem",
    marginBottom: "1rem",
    display: "block",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  dialogFooter: {
    display: "flex",
    gap: "0.5rem",
    justifyContent: "flex-end",
  },
};
