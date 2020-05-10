import { i18n } from './utils.js';

export class BetterRT {
    static async enhanceRollTableView(rollTableConfig, html, rollTable) {
        console.log("rollTableConfig ", rollTableConfig);
        console.log("html ", html[0]);
        console.log("rollTable ", rollTable);

        const tableClassName = rollTable.cssClass;// "editable";
        const tableEntity = rollTableConfig.object;

        const selectedTableType = tableEntity.getFlag("better-rolltables", "table-type") || "none";

        let tableViewClass = html[0].getElementsByClassName(tableClassName)[0];

        //re-renders
        if (tableViewClass) {
            html[0].style.display = 'none';
            html[0].style.display = 'block';
        }

        // console.log("tableViewClass ", htmlclass[0].getElementsByClassName("editable"));
        if (!tableViewClass) { //when the table is updated, the html is different
            if (html[0].getAttribute("class") === tableClassName) {
                tableViewClass = html[0];
            } else {
                console.log(`cannot find table class element ${tableClassName}`);
            }
        }

        let divBetterTableType = document.createElement("div");
        // divBetterTableType.setAttribute("class", "form-group");

        let selectTypeHtml = await renderTemplate("modules/better-rolltables/templates/select-table-type.html", tableEntity);
        divBetterTableType.innerHTML = selectTypeHtml;

        tableViewClass.insertBefore(divBetterTableType, tableViewClass.children[2]);

        const selectTypeElement = divBetterTableType.getElementsByTagName("select")[0];

        const allInputs = divBetterTableType.getElementsByTagName("input");
        const currencyInput = allInputs.namedItem("currency-input");


        if (currencyInput) {
            console.log("currencyInput value ", currencyInput.value);
            currencyInput.oninput = async function () { await BetterRT.onCurrencyInput(currencyInput.value, tableEntity); };
        }

        // selectTypeElement.value = selectedTableType;
        selectTypeElement.onchange = async function () { await BetterRT.onOptionTypeChanged(selectTypeElement.value, tableEntity); };


        //create generate loot button
        if (selectedTableType === "loot") {
            const footer = html[0].getElementsByClassName("sheet-footer flexrow")[0];
            console.log("footer ", footer);

            let generateLootBtn;
            console.log("adding button");
            generateLootBtn = document.createElement("button");
            generateLootBtn.setAttribute("class", "generate");
            generateLootBtn.setAttribute("type", "button");

            generateLootBtn.innerHTML = `<i id="BRT-gen-loot" class="fas fa-coins"></i> ${i18n('BRT.GenerateLoot.Button')}`;
            generateLootBtn.onclick = () => { BetterRT.generateLoot(tableEntity); };
            footer.insertBefore(generateLootBtn, footer.firstChild);
        }
    }

    static generateLoot(tableEntity) {
        console.log("Generate Loot button clicked ", tableEntity);
    }

    // game.tables.getName("Your Roll Table Name Here")
    static async onOptionTypeChanged(value, tableEntity) {
        // console.log("Value ", value, " . Entity: ", tableId);

        // const table = game.tables.entities.find(t => t.id === tableId);
        console.log("entity table ", tableEntity);

        // let updates = [];
        // updates.push({ "_id": tableId, "data.flags.better-rolltables.table-type": value })
        // await table.update(updates);

        await tableEntity.setFlag("better-rolltables", "table-type", value);
    }

    static async onCurrencyInput(value, tableEntity) {
        console.log("onCurrencyInput table ", tableEntity);

    }
}