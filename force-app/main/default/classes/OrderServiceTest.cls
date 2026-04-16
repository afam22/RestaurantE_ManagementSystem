@isTest
public class OrderServiceTest {

    @testSetup
    static void setupTestData() {
        // Create a test table
        Table__c table = new Table__c(
            Table_Number__c = 1,
            Capacity__c = 4,
            Status__c = 'Available'
        );
        insert table;

        // Create menu category and item
        Menu_Category__c category = new Menu_Category__c(
            Name = 'Mains',
            Display_Order__c = 1
        );
        insert category;

        Menu_Item__c item = new Menu_Item__c(
            Name = 'Grilled Chicken',
            Price__c = 18.99,
            Category__c = category.Id,
            Is_Available__c = true
        );
        insert item;
    }

    @isTest
    static void testSeatParty() {
        Table__c table = [SELECT Id FROM Table__c LIMIT 1];

        Test.startTest();
        Table_Session__c session = OrderService.seatParty(table.Id, 3);
        Test.stopTest();

        System.assertNotEquals(null, session.Id,
            'Session should be created');

        Table__c updatedTable = [SELECT Status__c 
                                  FROM Table__c 
                                  WHERE Id = :table.Id];
        System.assertEquals('Occupied', updatedTable.Status__c,
            'Table should be Occupied after seating');
    }

    @isTest
    static void testSubmitOrder() {
        Table__c table = [SELECT Id FROM Table__c LIMIT 1];
        Menu_Item__c item = [SELECT Id, Name, Price__c 
                              FROM Menu_Item__c LIMIT 1];

        Table_Session__c session = OrderService.seatParty(table.Id, 2);

        OrderService.OrderLineWrapper line = 
            new OrderService.OrderLineWrapper();
        line.menuItemId = item.Id;
        line.menuItemName = item.Name;
        line.quantity = 2;
        line.unitPrice = item.Price__c;
        line.specialInstructions = 'No salt please';

        Test.startTest();
        Order__c order = OrderService.submitOrder(
            session.Id,
            table.Id,
            new List<OrderService.OrderLineWrapper>{ line },
            'Table near window'
        );
        Test.stopTest();

        System.assertNotEquals(null, order.Id,
            'Order should be created');
        System.assertEquals('Sent to Kitchen', order.Status__c,
            'Order status should be Sent to Kitchen');

        List<Order_Line__c> lines = [
            SELECT Id FROM Order_Line__c 
            WHERE Order__c = :order.Id
        ];
        System.assertEquals(1, lines.size(),
            'One order line should be created');
    }
}