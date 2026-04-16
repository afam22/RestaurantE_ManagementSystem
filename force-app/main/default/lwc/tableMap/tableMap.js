import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getAllTables from '@salesforce/apex/OrderService.getAllTables';
import seatParty from '@salesforce/apex/OrderService.seatParty';

export default class TableMap extends LightningElement {

    @track tables = [];
    @track isLoading = true;
    @track showSeatModal = false;
    @track selectedTable = {};
    @track partySize = 1;

    wiredTablesResult;

    @wire(getAllTables)
    wiredTables(result) {
        this.wiredTablesResult = result;
        this.isLoading = false;
        if (result.data) {
            this.tables = result.data.map(table => ({
                ...table,
                isOccupied: table.Status__c === 'Occupied',
                cardClass: this.getCardClass(table.Status__c),
                seatedDuration: this.calculateDuration(
                    table.Current_Session__r?.Seated_Time__c
                )
            }));
        } else if (result.error) {
            this.showToast('Error', result.error.body.message, 'error');
        }
    }

    getCardClass(status) {
        const base = 'table-card slds-box slds-m-around_x-small';
        if (status === 'Available') return `${base} table-available`;
        if (status === 'Occupied') return `${base} table-occupied`;
        return `${base} table-reserved`;
    }

    calculateDuration(seatedTime) {
        if (!seatedTime) return '';
        const now = new Date();
        const seated = new Date(seatedTime);
        const diffMins = Math.floor((now - seated) / 60000);
        if (diffMins < 60) return `${diffMins} mins`;
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    }

    handleTableClick(event) {
        const tableId = event.currentTarget.dataset.id;
        const status = event.currentTarget.dataset.status;

        if (status === 'Available') {
            this.selectedTable = this.tables.find(t => t.Id === tableId);
            this.showSeatModal = true;
        } else if (status === 'Occupied') {
            // Navigate to order taking for this table
            this.dispatchEvent(new CustomEvent('tableselected', {
                detail: { tableId }
            }));
        }
    }

    handlePartySizeChange(event) {
        this.partySize = parseInt(event.target.value);
    }

    async handleSeatParty() {
        try {
            this.isLoading = true;
            await seatParty({
                tableId: this.selectedTable.Id,
                partySize: this.partySize
            });
            this.showToast('Success',
                `Party of ${this.partySize} seated at Table ${this.selectedTable.Table_Number__c}`,
                'success');
            this.closeModal();
            await refreshApex(this.wiredTablesResult);
        } catch (error) {
            this.showToast('Error', error.body.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    closeModal() {
        this.showSeatModal = false;
        this.selectedTable = {};
        this.partySize = 1;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}