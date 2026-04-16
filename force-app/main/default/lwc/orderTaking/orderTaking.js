import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getMenuWithItems from '@salesforce/apex/OrderService.getMenuWithItems';
import submitOrder from '@salesforce/apex/OrderService.submitOrder';

export default class OrderTaking extends LightningElement {

    @api tableId;
    @api sessionId;
    @api tableNumber;

    @track menuCategories = [];
    @track orderLines = [];
    @track orderNotes = '';
    @track isLoading = true;
    @track tempIdCounter = 0;

    @wire(getMenuWithItems)
    wiredMenu({ data, error }) {
        this.isLoading = false;
        if (data) {
            this.menuCategories = data;
        } else if (error) {
            this.showToast('Error', error.body.message, 'error');
        }
    }

    get hasOrderLines() {
        return this.orderLines.length > 0;
    }

    get subtotal() {
        return this.orderLines
            .reduce((sum, line) => sum + line.lineTotal, 0)
            .toFixed(2);
    }

    handleAddItem(event) {
        const itemId = event.currentTarget.dataset.id;
        const itemName = event.currentTarget.dataset.name;
        const itemPrice = parseFloat(event.currentTarget.dataset.price);

        // Check if item already in order
        const existingLine = this.orderLines.find(
            line => line.menuItemId === itemId
        );

        if (existingLine) {
            this.orderLines = this.orderLines.map(line => {
                if (line.menuItemId === itemId) {
                    const newQty = line.quantity + 1;
                    return {
                        ...line,
                        quantity: newQty,
                        lineTotal: parseFloat(
                            (newQty * line.unitPrice).toFixed(2)
                        )
                    };
                }
                return line;
            });
        } else {
            this.orderLines = [...this.orderLines, {
                tempId: `line-${++this.tempIdCounter}`,
                menuItemId: itemId,
                menuItemName: itemName,
                unitPrice: itemPrice,
                quantity: 1,
                lineTotal: itemPrice,
                specialInstructions: ''
            }];
        }
    }

    handleIncrement(event) {
        const tempId = event.currentTarget.dataset.id;
        this.orderLines = this.orderLines.map(line => {
            if (line.tempId === tempId) {
                const newQty = line.quantity + 1;
                return {
                    ...line,
                    quantity: newQty,
                    lineTotal: parseFloat(
                        (newQty * line.unitPrice).toFixed(2)
                    )
                };
            }
            return line;
        });
    }

    handleDecrement(event) {
        const tempId = event.currentTarget.dataset.id;
        this.orderLines = this.orderLines.map(line => {
            if (line.tempId === tempId && line.quantity > 1) {
                const newQty = line.quantity - 1;
                return {
                    ...line,
                    quantity: newQty,
                    lineTotal: parseFloat(
                        (newQty * line.unitPrice).toFixed(2)
                    )
                };
            }
            return line;
        }).filter(line => line.quantity > 0);
    }

    handleRemoveLine(event) {
        const tempId = event.currentTarget.dataset.id;
        this.orderLines = this.orderLines.filter(
            line => line.tempId !== tempId
        );
    }

    handleInstructionChange(event) {
        const tempId = event.currentTarget.dataset.id;
        const value = event.target.value;
        this.orderLines = this.orderLines.map(line => {
            if (line.tempId === tempId) {
                return { ...line, specialInstructions: value };
            }
            return line;
        });
    }

    handleNotesChange(event) {
        this.orderNotes = event.target.value;
    }

    async handleSubmitOrder() {
        if (this.orderLines.length === 0) {
            this.showToast('Warning',
                'Please add items before submitting', 'warning');
            return;
        }

        try {
            this.isLoading = true;

            // Prepare lines for Apex
            const apexLines = this.orderLines.map(line => ({
                menuItemId: line.menuItemId,
                menuItemName: line.menuItemName,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                specialInstructions: line.specialInstructions
            }));

            await submitOrder({
                sessionId: this.sessionId,
                tableId: this.tableId,
                orderLines: apexLines,
                specialNotes: this.orderNotes
            });

            this.showToast('Success',
                'Order sent to kitchen!', 'success');

            // Clear the order
            this.orderLines = [];
            this.orderNotes = '';

        } catch (error) {
            this.showToast('Error', error.body.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}