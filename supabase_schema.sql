-- ====================================================================
-- Office System - Supabase High-Performance Database Schema
-- Run this entire script in Supabase SQL Editor (1-Click Run)
-- ====================================================================

-- Table: "Settings"
CREATE TABLE IF NOT EXISTS "Settings" (
  "Key" TEXT PRIMARY KEY,
  "Value" TEXT DEFAULT ''
);
ALTER TABLE "Settings" DISABLE ROW LEVEL SECURITY;

-- Table: "Users"
CREATE TABLE IF NOT EXISTS "Users" (
  "UserId" TEXT PRIMARY KEY,
  "Name" TEXT DEFAULT '',
  "Email" TEXT DEFAULT '',
  "Role" TEXT DEFAULT '',
  "Pin" TEXT DEFAULT '',
  "Status" TEXT DEFAULT '',
  "AllowedTabs" TEXT DEFAULT '',
  "Avatar" TEXT DEFAULT '',
  "NIC" TEXT DEFAULT ''
);
ALTER TABLE "Users" DISABLE ROW LEVEL SECURITY;

-- Table: "Customers"
CREATE TABLE IF NOT EXISTS "Customers" (
  "CustomerId" TEXT PRIMARY KEY,
  "CustomerCode" TEXT DEFAULT '',
  "Name" TEXT DEFAULT '',
  "BusinessIdentifier" TEXT DEFAULT '',
  "BillingAddress" TEXT DEFAULT '',
  "DeliveryAddress" TEXT DEFAULT '',
  "Email" TEXT DEFAULT '',
  "Phone" TEXT DEFAULT '',
  "CreditLimit" TEXT DEFAULT '',
  "SalesOfficerId" TEXT DEFAULT '',
  "SalesOfficerName" TEXT DEFAULT '',
  "Notes" TEXT DEFAULT '',
  "CreatedAt" TEXT DEFAULT ''
);
ALTER TABLE "Customers" DISABLE ROW LEVEL SECURITY;

-- Table: "Inventory"
CREATE TABLE IF NOT EXISTS "Inventory" (
  "ItemId" TEXT PRIMARY KEY,
  "SKU" TEXT DEFAULT '',
  "Name" TEXT DEFAULT '',
  "Category" TEXT DEFAULT '',
  "UnitPrice" TEXT DEFAULT '',
  "StockQty" TEXT DEFAULT '',
  "ReorderLevel" TEXT DEFAULT '',
  "Unit" TEXT DEFAULT '',
  "UpdatedAt" TEXT DEFAULT ''
);
ALTER TABLE "Inventory" DISABLE ROW LEVEL SECURITY;

-- Table: "Invoices"
CREATE TABLE IF NOT EXISTS "Invoices" (
  "InvoiceId" TEXT PRIMARY KEY,
  "InvoiceNo" TEXT DEFAULT '',
  "CustomerId" TEXT DEFAULT '',
  "CustomerName" TEXT DEFAULT '',
  "Date" TEXT DEFAULT '',
  "DueDate" TEXT DEFAULT '',
  "Status" TEXT DEFAULT '',
  "Subtotal" TEXT DEFAULT '',
  "Discount" TEXT DEFAULT '',
  "TaxAmount" TEXT DEFAULT '',
  "Total" TEXT DEFAULT '',
  "PaidAmount" TEXT DEFAULT '',
  "Notes" TEXT DEFAULT '',
  "CreatedBy" TEXT DEFAULT '',
  "QuoteNo" TEXT DEFAULT '',
  "SalesPerson" TEXT DEFAULT '',
  "CustomerAddress" TEXT DEFAULT '',
  "CustomerPhone" TEXT DEFAULT '',
  "BankDetails" TEXT DEFAULT '',
  "CompanyId" TEXT DEFAULT '',
  "ChequeNo" TEXT DEFAULT '',
  "ChequeBank" TEXT DEFAULT '',
  "ChequeDate" TEXT DEFAULT '',
  "ChequeAmount" TEXT DEFAULT '',
  "RealisedDate" TEXT DEFAULT '',
  "RealizedMonth" TEXT DEFAULT '',
  "ReceiptNo" TEXT DEFAULT '',
  "PaymentStatus" TEXT DEFAULT '',
  "TokenAmount" TEXT DEFAULT '',
  "ReturnAmount" TEXT DEFAULT '',
  "DispatchStatus" TEXT DEFAULT 'Dispatched',
  "DispatchedDate" TEXT DEFAULT '',
  "DispatchedBy" TEXT DEFAULT '',
  "PaymentsJson" TEXT DEFAULT ''
);
ALTER TABLE "Invoices" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "DispatchStatus" TEXT DEFAULT 'Dispatched';
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "DispatchedDate" TEXT DEFAULT '';
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "DispatchedBy" TEXT DEFAULT '';
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "PaymentsJson" TEXT DEFAULT '';

-- Table: "InvoiceItems"
CREATE TABLE IF NOT EXISTS "InvoiceItems" (
  "LineId" TEXT PRIMARY KEY,
  "InvoiceId" TEXT DEFAULT '',
  "ItemId" TEXT DEFAULT '',
  "ItemName" TEXT DEFAULT '',
  "Qty" TEXT DEFAULT '',
  "UnitPrice" TEXT DEFAULT '',
  "LineTotal" TEXT DEFAULT '',
  "ItemCode" TEXT DEFAULT '',
  "DiscountPercent" TEXT DEFAULT ''
);
ALTER TABLE "InvoiceItems" DISABLE ROW LEVEL SECURITY;

-- Table: "CompanyProfiles"
CREATE TABLE IF NOT EXISTS "CompanyProfiles" (
  "CompanyId" TEXT PRIMARY KEY,
  "CompanyName" TEXT DEFAULT '',
  "Address" TEXT DEFAULT '',
  "Phone" TEXT DEFAULT '',
  "Email" TEXT DEFAULT '',
  "Website" TEXT DEFAULT '',
  "BankName" TEXT DEFAULT '',
  "Branch" TEXT DEFAULT '',
  "AccountNo" TEXT DEFAULT '',
  "Logo" TEXT DEFAULT '',
  "IsDefault" TEXT DEFAULT '',
  "InvoicePrefix" TEXT DEFAULT '',
  "NextInvoiceNo" TEXT DEFAULT '',
  "QuotePrefix" TEXT DEFAULT '',
  "NextQuoteNo" TEXT DEFAULT '',
  "CreatedAt" TEXT DEFAULT ''
);
ALTER TABLE "CompanyProfiles" DISABLE ROW LEVEL SECURITY;

-- Table: "Quotations"
CREATE TABLE IF NOT EXISTS "Quotations" (
  "QuotationId" TEXT PRIMARY KEY,
  "QuotationNo" TEXT DEFAULT '',
  "Date" TEXT DEFAULT '',
  "CustomerId" TEXT DEFAULT '',
  "CustomerName" TEXT DEFAULT '',
  "BillingAddress" TEXT DEFAULT '',
  "Description" TEXT DEFAULT '',
  "TotalAmount" TEXT DEFAULT '',
  "Status" TEXT DEFAULT '',
  "DataJson" TEXT DEFAULT '',
  "CompanyId" TEXT DEFAULT '',
  "CreatedBy" TEXT DEFAULT '',
  "CreatedAt" TEXT DEFAULT ''
);
ALTER TABLE "Quotations" DISABLE ROW LEVEL SECURITY;

-- Table: "Creditors"
CREATE TABLE IF NOT EXISTS "Creditors" (
  "CreditorId" TEXT PRIMARY KEY,
  "SupplierName" TEXT DEFAULT '',
  "BillNo" TEXT DEFAULT '',
  "Date" TEXT DEFAULT '',
  "DueDate" TEXT DEFAULT '',
  "TotalAmount" TEXT DEFAULT '',
  "PaidAmount" TEXT DEFAULT '',
  "Status" TEXT DEFAULT '',
  "Notes" TEXT DEFAULT ''
);
ALTER TABLE "Creditors" DISABLE ROW LEVEL SECURITY;

-- Table: "PettyCash"
CREATE TABLE IF NOT EXISTS "PettyCash" (
  "PcId" TEXT PRIMARY KEY,
  "VoucherNo" TEXT DEFAULT '',
  "Date" TEXT DEFAULT '',
  "Type" TEXT DEFAULT '',
  "Category" TEXT DEFAULT '',
  "Description" TEXT DEFAULT '',
  "PaidTo" TEXT DEFAULT '',
  "ReceiptNo" TEXT DEFAULT '',
  "Amount" TEXT DEFAULT '',
  "RecordedBy" TEXT DEFAULT ''
);
ALTER TABLE "PettyCash" DISABLE ROW LEVEL SECURITY;

-- Table: "CallReports"
CREATE TABLE IF NOT EXISTS "CallReports" (
  "CallId" TEXT PRIMARY KEY,
  "ReportType" TEXT DEFAULT '',
  "DataJson" TEXT DEFAULT '',
  "CreatedBy" TEXT DEFAULT '',
  "CreatedAt" TEXT DEFAULT ''
);
ALTER TABLE "CallReports" DISABLE ROW LEVEL SECURITY;

-- Table: "ProjectReports"
CREATE TABLE IF NOT EXISTS "ProjectReports" (
  "ProjId" TEXT PRIMARY KEY,
  "DataJson" TEXT DEFAULT '',
  "CreatedBy" TEXT DEFAULT '',
  "CreatedAt" TEXT DEFAULT ''
);
ALTER TABLE "ProjectReports" DISABLE ROW LEVEL SECURITY;

-- Table: "PainterQuotations"
CREATE TABLE IF NOT EXISTS "PainterQuotations" (
  "QuotationId" TEXT PRIMARY KEY,
  "QuotationNo" TEXT DEFAULT '',
  "Date" TEXT DEFAULT '',
  "Title" TEXT DEFAULT '',
  "QuotationFor" TEXT DEFAULT '',
  "Supplier" TEXT DEFAULT '',
  "Receivers" TEXT DEFAULT '',
  "Place" TEXT DEFAULT '',
  "Time" TEXT DEFAULT '',
  "TotalAmount" TEXT DEFAULT '',
  "AdvanceAmount" TEXT DEFAULT '',
  "RemainingAmount" TEXT DEFAULT '',
  "ItemsJson" TEXT DEFAULT '',
  "Status" TEXT DEFAULT '',
  "CreatedBy" TEXT DEFAULT '',
  "CreatedAt" TEXT DEFAULT ''
);
ALTER TABLE "PainterQuotations" DISABLE ROW LEVEL SECURITY;

-- Table: "PainterBillBalances"
CREATE TABLE IF NOT EXISTS "PainterBillBalances" (
  "BalanceId" TEXT PRIMARY KEY,
  "ProgramName" TEXT DEFAULT '',
  "Date" TEXT DEFAULT '',
  "Description" TEXT DEFAULT '',
  "Withdrawal" TEXT DEFAULT '',
  "Deposit" TEXT DEFAULT '',
  "Balance" TEXT DEFAULT '',
  "CreatedBy" TEXT DEFAULT '',
  "CreatedAt" TEXT DEFAULT ''
);
ALTER TABLE "PainterBillBalances" DISABLE ROW LEVEL SECURITY;

-- Table: "PainterParticipants"
CREATE TABLE IF NOT EXISTS "PainterParticipants" (
  "ParticipantId" TEXT PRIMARY KEY,
  "ProgramName" TEXT DEFAULT '',
  "Date" TEXT DEFAULT '',
  "Name" TEXT DEFAULT '',
  "Address" TEXT DEFAULT '',
  "NIC" TEXT DEFAULT '',
  "Phone" TEXT DEFAULT '',
  "CreatedBy" TEXT DEFAULT '',
  "CreatedAt" TEXT DEFAULT ''
);
ALTER TABLE "PainterParticipants" DISABLE ROW LEVEL SECURITY;

-- Table: "Employees"
CREATE TABLE IF NOT EXISTS "Employees" (
  "EmpId" TEXT PRIMARY KEY,
  "Name" TEXT DEFAULT '',
  "Designation" TEXT DEFAULT '',
  "Address" TEXT DEFAULT '',
  "NIC" TEXT DEFAULT '',
  "EpfEtfNo" TEXT DEFAULT '',
  "DOB" TEXT DEFAULT '',
  "Gender" TEXT DEFAULT '',
  "Position" TEXT DEFAULT '',
  "Email" TEXT DEFAULT '',
  "Phone" TEXT DEFAULT '',
  "EmergencyContactName" TEXT DEFAULT '',
  "EmergencyContactPhone" TEXT DEFAULT '',
  "JoinDate" TEXT DEFAULT '',
  "Status" TEXT DEFAULT '',
  "BankName" TEXT DEFAULT '',
  "BankBranch" TEXT DEFAULT '',
  "BankAccountNo" TEXT DEFAULT '',
  "Department" TEXT DEFAULT '',
  "BasicSalary" NUMERIC DEFAULT 0,
  "SalesTarget" NUMERIC DEFAULT 0,
  "CollectionTarget" NUMERIC DEFAULT 0,
  "TargetPeriod" TEXT DEFAULT ''
);
ALTER TABLE "Employees" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Employees" ADD COLUMN IF NOT EXISTS "Department" TEXT DEFAULT '';
ALTER TABLE "Employees" ADD COLUMN IF NOT EXISTS "BasicSalary" NUMERIC DEFAULT 0;
ALTER TABLE "Employees" ADD COLUMN IF NOT EXISTS "SalesTarget" NUMERIC DEFAULT 0;
ALTER TABLE "Employees" ADD COLUMN IF NOT EXISTS "CollectionTarget" NUMERIC DEFAULT 0;
ALTER TABLE "Employees" ADD COLUMN IF NOT EXISTS "TargetPeriod" TEXT DEFAULT '';

-- Table: "CustomTabs"
CREATE TABLE IF NOT EXISTS "CustomTabs" (
  "TabId" TEXT PRIMARY KEY,
  "Name" TEXT DEFAULT '',
  "Icon" TEXT DEFAULT '',
  "ColumnsJson" TEXT DEFAULT '',
  "CreatedBy" TEXT DEFAULT '',
  "UpdatedAt" TEXT DEFAULT ''
);
ALTER TABLE "CustomTabs" DISABLE ROW LEVEL SECURITY;

-- Table: "CustomTabRows"
CREATE TABLE IF NOT EXISTS "CustomTabRows" (
  "RowId" TEXT PRIMARY KEY,
  "TabId" TEXT DEFAULT '',
  "DataJson" TEXT DEFAULT '',
  "CreatedBy" TEXT DEFAULT '',
  "CreatedAt" TEXT DEFAULT ''
);
ALTER TABLE "CustomTabRows" DISABLE ROW LEVEL SECURITY;

-- Table: "Transactions"
CREATE TABLE IF NOT EXISTS "Transactions" (
  "TxId" TEXT PRIMARY KEY,
  "Date" TEXT DEFAULT '',
  "Type" TEXT DEFAULT '',
  "Category" TEXT DEFAULT '',
  "Description" TEXT DEFAULT '',
  "Amount" TEXT DEFAULT '',
  "RefId" TEXT DEFAULT '',
  "RecordedBy" TEXT DEFAULT ''
);
ALTER TABLE "Transactions" DISABLE ROW LEVEL SECURITY;

-- Table: "Attendance"
CREATE TABLE IF NOT EXISTS "Attendance" (
  "AttId" TEXT PRIMARY KEY,
  "UserId" TEXT DEFAULT '',
  "UserName" TEXT DEFAULT '',
  "Date" TEXT DEFAULT '',
  "ClockIn" TEXT DEFAULT '',
  "ClockOut" TEXT DEFAULT '',
  "Status" TEXT DEFAULT '',
  "Notes" TEXT DEFAULT ''
);
ALTER TABLE "Attendance" DISABLE ROW LEVEL SECURITY;

-- Table: "Leaves"
CREATE TABLE IF NOT EXISTS "Leaves" (
  "LeaveId" TEXT PRIMARY KEY,
  "UserId" TEXT DEFAULT '',
  "UserName" TEXT DEFAULT '',
  "Type" TEXT DEFAULT '',
  "StartDate" TEXT DEFAULT '',
  "EndDate" TEXT DEFAULT '',
  "Days" TEXT DEFAULT '',
  "Reason" TEXT DEFAULT '',
  "Status" TEXT DEFAULT '',
  "ApprovedBy" TEXT DEFAULT ''
);
ALTER TABLE "Leaves" DISABLE ROW LEVEL SECURITY;

-- Table: "Tasks"
CREATE TABLE IF NOT EXISTS "Tasks" (
  "TaskId" TEXT PRIMARY KEY,
  "Title" TEXT DEFAULT '',
  "Project" TEXT DEFAULT '',
  "AssigneeId" TEXT DEFAULT '',
  "AssigneeName" TEXT DEFAULT '',
  "DueDate" TEXT DEFAULT '',
  "Priority" TEXT DEFAULT '',
  "Status" TEXT DEFAULT '',
  "Notes" TEXT DEFAULT '',
  "CreatedAt" TEXT DEFAULT ''
);
ALTER TABLE "Tasks" DISABLE ROW LEVEL SECURITY;

-- Table: "SavedReports"
CREATE TABLE IF NOT EXISTS "SavedReports" (
  "ReportId" TEXT PRIMARY KEY,
  "Name" TEXT DEFAULT '',
  "Source" TEXT DEFAULT '',
  "ConfigJson" TEXT DEFAULT '',
  "CreatedBy" TEXT DEFAULT '',
  "UpdatedAt" TEXT DEFAULT ''
);
ALTER TABLE "SavedReports" DISABLE ROW LEVEL SECURITY;

