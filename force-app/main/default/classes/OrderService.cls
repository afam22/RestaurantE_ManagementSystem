public with sharing class OrderService {

    // Creates a new table session when a party is seated
    @AuraEnabled
    public static Table_Session__c seatParty(Id tableId, Integer partySize) {
        try {
            // Create the session
            Table_Session__c session = new Table_Session__c(
                Table__c = tableId,
                Party_Size__c = partySize,
                Seated_Time__c = DateTime.now(),
                Status__c = 'Active'
            );
            insert session;

            // Update the table status to Occupied
            Table__c table = new Table__c(
                Id = tableId,
                Status__c = 'Occupied',
                Current_Session__c = session.Id
            );
            update table;

            return session;

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // Submits an order and fires a platform event to the kitchen
    @AuraEnabled
    public static Order__c submitOrder(Id sessionId, 
                                       Id tableId,
                                       List<OrderLineWrapper> orderLines,
                                       String specialNotes) {
        try {
            // Create the order
            Order__c order = new Order__c(
                Table_Session__c = sessionId,
                Table__c = tableId,
                Status__c = 'Sent to Kitchen',
                Order_Time__c = DateTime.now(),
                Special_Notes__c = specialNotes
            );
            insert order;

            // Create order lines
            List<Order_Line__c> lines = new List<Order_Line__c>();
            for (OrderLineWrapper wrapper : orderLines) {
                lines.add(new Order_Line__c(
                    Order__c = order.Id,
                    Menu_Item__c = wrapper.menuItemId,
                    Quantity__c = wrapper.quantity,
                    Unit_Price__c = wrapper.unitPrice,
                    Special_Instructions__c = wrapper.specialInstructions
                ));
            }
            insert lines;

            // Fire platform event to notify kitchen
            publishKitchenEvent(order, orderLines, tableId, specialNotes);

            return order;

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // Publishes the kitchen platform event
    private static void publishKitchenEvent(Order__c order,
                                             List<OrderLineWrapper> lines,
                                             Id tableId,
                                             String specialNotes) {
        // Get table number
        Table__c table = [SELECT Table_Number__c 
                          FROM Table__c 
                          WHERE Id = :tableId 
                          LIMIT 1];

        // Build order details JSON
        List<Map<String, Object>> itemDetails = new List<Map<String, Object>>();
        for (OrderLineWrapper line : lines) {
            itemDetails.add(new Map<String, Object>{
                'name' => line.menuItemName,
                'quantity' => line.quantity,
                'instructions' => line.specialInstructions
            });
        }

        Kitchen_Order_Event__e kitchenEvent = new Kitchen_Order_Event__e(
            Table_Number__c = String.valueOf(table.Table_Number__c),
            Order_Id__c = order.Id,
            Order_Details__c = JSON.serialize(itemDetails),
            Order_Time__c = order.Order_Time__c,
            Special_Notes__c = specialNotes
        );

        EventBus.publish(kitchenEvent);
    }

    // Updates order status
    @AuraEnabled
    public static void updateOrderStatus(Id orderId, String newStatus) {
        try {
            update new Order__c(
                Id = orderId,
                Status__c = newStatus
            );
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // Gets all active orders for the kitchen display
    @AuraEnabled(cacheable=true)
    public static List<Order__c> getActiveKitchenOrders() {
        return [
            SELECT Id, Status__c, Order_Time__c, Special_Notes__c,
                   Table__r.Table_Number__c,
                   (SELECT Id, Quantity__c, Unit_Price__c,
                           Special_Instructions__c,
                           Menu_Item__r.Name
                    FROM Order_Lines__r)
            FROM Order__c
            WHERE Status__c IN ('Sent to Kitchen', 'In Preparation')
            ORDER BY Order_Time__c ASC
        ];
    }

    // Gets all menu items grouped by category
    @AuraEnabled(cacheable=true)
    public static List<Menu_Category__c> getMenuWithItems() {
        return [
            SELECT Id, Name, Display_Order__c,
                   (SELECT Id, Name, Description__c,
                           Price__c, Is_Available__c, Image_URL__c
                    FROM Menu_Items__r
                    WHERE Is_Available__c = true
                    ORDER BY Name ASC)
            FROM Menu_Category__c
            ORDER BY Display_Order__c ASC
        ];
    }

    // Gets all tables with current status
    @AuraEnabled(cacheable=true)
    public static List<Table__c> getAllTables() {
        return [
            SELECT Id, Table_Number__c, Capacity__c,
                   Status__c, Current_Session__c,
                   Current_Session__r.Seated_Time__c,
                   Current_Session__r.Party_Size__c
            FROM Table__c
            ORDER BY Table_Number__c ASC
        ];
    }

    // Wrapper class for order line data from LWC
    public class OrderLineWrapper {
        @AuraEnabled public Id menuItemId { get; set; }
        @AuraEnabled public String menuItemName { get; set; }
        @AuraEnabled public Integer quantity { get; set; }
        @AuraEnabled public Decimal unitPrice { get; set; }
        @AuraEnabled public String specialInstructions { get; set; }
    }
}