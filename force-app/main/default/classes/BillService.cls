public with sharing class BillService {

    // Generates a consolidated bill for a table session
    @AuraEnabled
    public static Bill__c generateBill(Id sessionId) {
        try {
            // Get all orders and lines for this session
            List<Order__c> orders = [
                SELECT Id, Subtotal__c
                FROM Order__c
                WHERE Table_Session__c = :sessionId
                AND Status__c != 'Billed'
            ];

            Decimal subtotal = 0;
            for (Order__c order : orders) {
                subtotal += (order.Subtotal__c != null ? 
                             order.Subtotal__c : 0);
            }

            // Create the bill
            Bill__c bill = new Bill__c(
                Table_Session__c = sessionId,
                Subtotal__c = subtotal,
                Tax_Percentage__c = 13, // Configurable
                Status__c = 'Draft'
            );
            insert bill;

            // Mark all orders as Billed
            List<Order__c> ordersToUpdate = new List<Order__c>();
            for (Order__c order : orders) {
                ordersToUpdate.add(new Order__c(
                    Id = order.Id,
                    Status__c = 'Billed'
                ));
            }
            update ordersToUpdate;

            // Update session status
            update new Table_Session__c(
                Id = sessionId,
                Status__c = 'Billed'
            );

            return bill;

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // Records payment and closes the table
    @AuraEnabled
    public static void recordPayment(Id billId, 
                                     Id sessionId,
                                     Id tableId,
                                     String paymentMethod) {
        try {
            // Update bill to paid
            update new Bill__c(
                Id = billId,
                Status__c = 'Paid',
                Payment_Method__c = paymentMethod,
                Payment_Time__c = DateTime.now()
            );

            // Close the session
            update new Table_Session__c(
                Id = sessionId,
                Status__c = 'Closed'
            );

            // Free up the table
            update new Table__c(
                Id = tableId,
                Status__c = 'Available',
                Current_Session__c = null
            );

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // Gets full bill details for display
    @AuraEnabled(cacheable=true)
    public static BillDetailWrapper getBillDetails(Id sessionId) {
        Table_Session__c session = [
            SELECT Id, Party_Size__c, Seated_Time__c,
                   Table__r.Table_Number__c,
                   (SELECT Id, Order_Time__c,
                           (SELECT Menu_Item__r.Name,
                                   Quantity__c,
                                   Unit_Price__c,
                                   Line_Total__c,
                                   Special_Instructions__c
                            FROM Order_Lines__r)
                    FROM Orders__r)
            FROM Table_Session__c
            WHERE Id = :sessionId
        ];

        Bill__c bill = [
            SELECT Id, Subtotal__c, Tax_Percentage__c,
                   Tax_Amount__c, Total_Amount__c, Status__c
            FROM Bill__c
            WHERE Table_Session__c = :sessionId
            LIMIT 1
        ];

        BillDetailWrapper wrapper = new BillDetailWrapper();
        wrapper.session = session;
        wrapper.bill = bill;
        return wrapper;
    }

    public class BillDetailWrapper {
        @AuraEnabled public Table_Session__c session { get; set; }
        @AuraEnabled public Bill__c bill { get; set; }
    }
}