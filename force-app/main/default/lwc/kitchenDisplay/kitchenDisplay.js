import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { subscribe, MessageContext } from 'lightning/messageService';
import { refreshApex } from '@salesforce/apex';
import getActiveKitchenOrders from '@salesforce/apex/OrderService.getActiveKitchenOrders';
import updateOrderStatus from '@salesforce/apex/OrderService.updateOrderStatus';

// Platform Event subscription
import { subscribe as subscribeEmp, 
         unsubscribe as unsubscribeEmp,
         onError } from 'lightning/empApi';

export default class KitchenDisplay extends LightningElement {

    @track activeOrders = [];
    @track isLoading = true;

    subscription = {};
    channelName = '/event/Kitchen_Order_Event__e';
    wiredOrdersResult;

    @wire(getActiveKitchenOrders)
    wiredOrders(result) {
        this.wiredOrdersResult = result;
        this.isLoading = false;
        if (result.data) {
            this.activeOrders = this.enrichOrders(result.data);
        } else if (result.error) {
            this.showToast('Error', result.error.body.message, 'error');
        }
    }

    connectedCallback() {
        this.subscribeToKitchenEvents();
        onError(error => {
            console.error('EMP API error:', JSON.stringify(error));
        });
    }

    disconnectedCallback() {
        unsubscribeEmp(this.subscription, response => {
            console.log('Unsubscribed from kitchen events:', response);
        });
    }

    subscribeToKitchenEvents() {
        const messageCallback = (response) => {
            console.log('New kitchen event received:', 
                        JSON.stringify(response));
            // Refresh orders when a new order event fires
            refreshApex(this.wiredOrdersResult);
            this.showToast(
                '🍽️ New Order',
                `New order for Table ${response.data.payload.Table_Number__c}`,
                'info'
            );
        };

        subscribeEmp(
            this.channelName,
            -1,
            messageCallback
        ).then(response => {
            this.subscription = response;
            console.log('Subscribed to kitchen events:', 
                        JSON.stringify(response));
        });
    }

    enrichOrders(orders) {
        return orders.map(order => ({
            ...order,
            formattedTime: this.formatTime(order.Order_Time__c),
            cardClass: this.getCardClass(order.Status__c),
            statusClass: this.getStatusClass(order.Status__c),
            canStartPrep: order.Status__c === 'Sent to Kitchen',
            canMarkReady: order.Status__c === 'In Preparation'
        }));
    }

    formatTime(dateTimeString) {
        if (!dateTimeString) return '';
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getCardClass(status) {
        const base = 'order-card slds-box';
        if (status === 'Sent to Kitchen') return `${base} card-new`;
        if (status === 'In Preparation') return `${base} card-preparing`;
        return base;
    }

    getStatusClass(status) {
        if (status === 'Sent to Kitchen') return 'status-badge badge-new';
        if (status === 'In Preparation') return 'status-badge badge-prep';
        return 'status-badge';
    }

    get hasOrders() {
        return this.activeOrders.length > 0;
    }

    async handleStartPrep(event) {
        const orderId = event.currentTarget.dataset.id;
        try {
            await updateOrderStatus({
                orderId,
                newStatus: 'In Preparation'
            });
            await refreshApex(this.wiredOrdersResult);
        } catch (error) {
            this.showToast('Error', error.body.message, 'error');
        }
    }

    async handleMarkReady(event) {
        const orderId = event.currentTarget.dataset.id;
        try {
            await updateOrderStatus({
                orderId,
                newStatus: 'Ready for Service'
            });
            await refreshApex(this.wiredOrdersResult);
            this.showToast('Ready',
                'Order is ready for service!', 'success');
        } catch (error) {
            this.showToast('Error', error.body.message, 'error');
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}