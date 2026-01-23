import React, { useState } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Table from "@cloudscape-design/components/table";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import "@cloudscape-design/global-styles/index.css";

interface Customer {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  mrr: number;
}

export function SaasDemoApp() {
  const [customers, setCustomers] = useState<Customer[]>([
    { id: "1", name: "Acme Corp", email: "contact@acme.com", plan: "Enterprise", status: "active", mrr: 999 },
    { id: "2", name: "TechStart Inc", email: "hello@techstart.io", plan: "Pro", status: "active", mrr: 299 },
    { id: "3", name: "Design Co", email: "team@design.co", plan: "Basic", status: "trial", mrr: 99 },
    { id: "4", name: "Dev Studios", email: "info@devstudios.com", plan: "Pro", status: "active", mrr: 299 },
    { id: "5", name: "Cloud Systems", email: "support@cloudsys.com", plan: "Enterprise", status: "active", mrr: 999 },
  ]);

  const [selectedItems, setSelectedItems] = useState<Customer[]>([]);

  const handleAddCustomer = () => {
    window.shell.feedback.info("Add customer dialog would open here");
  };

  const handleDeleteCustomers = async () => {
    const confirmed = await window.shell.feedback.confirm(
      `Are you sure you want to delete ${selectedItems.length} customer(s)?`,
      "Delete Customers"
    );

    if (confirmed) {
      setCustomers(customers.filter(c => !selectedItems.find(s => s.id === c.id)));
      setSelectedItems([]);
      window.shell.feedback.success(`Deleted ${selectedItems.length} customer(s)`);
    }
  };

  const totalMRR = customers.reduce((sum, c) => sum + c.mrr, 0);
  const activeCustomers = customers.filter(c => c.status === "active").length;

  return (
    <SpaceBetween size="l">
      {/* Metrics */}
      <Container>
        <SpaceBetween size="l" direction="horizontal">
          <Box>
            <Box variant="awsui-key-label">Total MRR</Box>
            <Box fontSize="display-l" fontWeight="bold" color="text-status-success">
              ${totalMRR.toLocaleString()}
            </Box>
          </Box>
          <Box>
            <Box variant="awsui-key-label">Active Customers</Box>
            <Box fontSize="display-l" fontWeight="bold">
              {activeCustomers}
            </Box>
          </Box>
          <Box>
            <Box variant="awsui-key-label">Trial Customers</Box>
            <Box fontSize="display-l" fontWeight="bold">
              {customers.filter(c => c.status === "trial").length}
            </Box>
          </Box>
        </SpaceBetween>
      </Container>

      {/* Customer Table */}
      <Table
        header={
          <Header
            variant="h2"
            counter={`(${customers.length})`}
            actions={
              <SpaceBetween size="xs" direction="horizontal">
                <Button
                  disabled={selectedItems.length === 0}
                  onClick={handleDeleteCustomers}
                >
                  Delete
                </Button>
                <Button variant="primary" onClick={handleAddCustomer}>
                  Add Customer
                </Button>
              </SpaceBetween>
            }
          >
            Customers
          </Header>
        }
        columnDefinitions={[
          {
            id: "name",
            header: "Name",
            cell: (item) => item.name,
            sortingField: "name",
          },
          {
            id: "email",
            header: "Email",
            cell: (item) => item.email,
          },
          {
            id: "plan",
            header: "Plan",
            cell: (item) => item.plan,
          },
          {
            id: "status",
            header: "Status",
            cell: (item) => (
              <Badge color={item.status === "active" ? "green" : "blue"}>
                {item.status}
              </Badge>
            ),
          },
          {
            id: "mrr",
            header: "MRR",
            cell: (item) => `$${item.mrr}`,
          },
        ]}
        items={customers}
        selectionType="multi"
        selectedItems={selectedItems}
        onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
        empty={
          <Box textAlign="center" color="inherit">
            <b>No customers</b>
            <Box padding={{ bottom: "s" }} variant="p" color="inherit">
              No customers to display.
            </Box>
            <Button onClick={handleAddCustomer}>Add Customer</Button>
          </Box>
        }
      />
    </SpaceBetween>
  );
}
