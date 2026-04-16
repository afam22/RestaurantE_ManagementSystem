# Salesforce DX Project: Next Steps

Now that you’ve created a Salesforce DX project, what’s next? Here are some documentation resources to get you started.

## How Do You Plan to Deploy Your Changes?

Do you want to deploy a set of changes, or create a self-contained application? Choose a [development model](https://developer.salesforce.com/tools/vscode/en/user-guide/development-models).

## Configure Your Salesforce DX Project

The `sfdx-project.json` file contains useful configuration information for your project. See [Salesforce DX Project Configuration](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_ws_config.htm) in the _Salesforce DX Developer Guide_ for details about this file.

## Read All About It

- [Salesforce Extensions Documentation](https://developer.salesforce.com/tools/vscode/)
- [Salesforce CLI Setup Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm)
- [Salesforce DX Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_intro.htm)
- [Salesforce CLI Command Reference](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference.htm)

# Restaurant E-Management System (Salesforce)

## 📌 Project Overview
A comprehensive digital transformation project designed to replace paper-based ordering in a mid-size restaurant. This Salesforce-based solution provides a real-time interface for waitstaff to take orders via tablets, enables kitchen staff to manage preparation queues, and gives managers deep visibility into restaurant performance.

---

## 🏗️ Business Context & Objectives
The goal of this system is to streamline the lifecycle of a dining experience—from seating a customer to final payment—ensuring data accuracy, reducing wait times, and providing real-time kitchen notifications.

### Key Workflows:
* **Front-of-House:** Table management, digital menu browsing, and order entry.
* **Back-of-House:** Real-time kitchen display and order status tracking.
* **Management:** Performance dashboards and bill generation.

---

## 🛠️ System Architecture (Technical Mapping)

### 1. Data Model (Custom Objects)
* **Table__c:** Tracks table number, seating capacity, and status (Available, Occupied, Reserved).
* **Menu_Item__c:** Stores item details, price, category (Starters, Mains, etc.), and availability.
* **Table_Session__c:** Links multiple orders to a single seating for bill consolidation.
* **Order__c:** Represents a specific order round (e.g., Starters round).
* **Order_Line_Item__c:** Junction object between Order and Menu Item, capturing quantity and special instructions.
* **Bill__c:** Financial record consolidating all table session costs.

### 2. Automation & Real-Time Logic
* **Platform Events:** Used for **BR-004** to push instant notifications to the kitchen display without manual refreshing.
* **Flow Builder:**
    * **Auto-Calculation:** Calculates line totals and order subtotals.
    * **Status Management:** Records timestamps for every status change (New → In Prep → Served).
    * **Table Logic:** Automatically resets Table status to 'Available' upon Bill payment.
* **Formula Fields:** Used for tax calculations and final billing totals.

---

## 📋 Business Requirements Coverage

| ID | Requirement | Salesforce Solution |
|:---|:--- |:--- |
| **BR-001** | Table Management | Custom Object with Status Picklists & Lightning Record Pages. |
| **BR-002** | Menu Management | Product/Custom Object with Category grouping and "In Stock" flags. |
| **BR-003** | Order Taking | Lightning Web Component (LWC) for a tablet-optimized POS interface. |
| **BR-004** | Kitchen Notification | Platform Events + LWC `empApi` for real-time alerts. |
| **BR-005** | Status Tracking | Path Component & Record-Triggered Flows for timestamping. |
| **BR-006** | Multi-Course | Parent-Child relationship (Table Session → Orders). |
| **BR-007** | Bill Generation | Roll-up Summary fields and a "Generate Bill" Flow. |
| **BR-008** | Payment Recording | Quick Action to capture Payment Method & update Table status. |
| **BR-009** | Kitchen Display | Custom LWC "Kitchen Dashboard" using Card Layouts. |
| **BR-010** | Manager Dashboard | Salesforce Reports & Dashboards with conditional highlighting for delays. |

---

## 🚀 Key Features

### 👨‍🍳 Real-Time Kitchen Display
The kitchen staff uses a dedicated screen that updates instantly when an order is submitted. Using **Platform Events**, orders appear as interactive cards. Kitchen staff can move an order to "Ready for Service" with a single click.

### 📱 Tablet-Optimized Interface
Designed for mobility, the waitstaff interface allows for rapid selection of menu items, adding special instructions (e.g., "No Nuts"), and viewing a live subtotal of the current table's session.

### 📊 Manager Insights
A real-time dashboard provides:
* Average preparation time per dish.
* Table turnover rates.
* Revenue by category (Drinks vs. Food).
* Alerts for "stale" orders exceeding the time threshold.

---

## 🔧 Installation & Setup
1. Clone this repository.
2. Authorize your Salesforce Org: `sf org login web`
3. Deploy source code: `sf project deploy start`
4. Assign the **Restaurant_Staff** Permission Set to your users.
5. Import sample Menu Item data using Data Loader or Import Wizard.

---

## 📸 Screenshots
*(Add your screenshots here)*
* *Table Grid View*
* *Kitchen LWC Dashboard*
* *Manager Performance Report*

---

## 📝 Future Enhancements
* Integration with external Payment Gateways (Stripe/PayPal).
* Customer-facing QR code ordering.
* Inventory management (Auto-deducting ingredients from stock).
