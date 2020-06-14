import { i18n } from './core/utils.js';
import { BRTCONFIG } from './core/config.js';
import { dropEventOnTable } from './core/brt-helper.js';

export class BetterRT {
    static async enhanceRollTableView(rollTableConfig, html, rollTable) {
        const tableClassName = rollTable.cssClass;// "editable";
        const tableEntity = rollTableConfig.object;
        const selectedTableType = tableEntity.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.TABLE_TYPE_KEY) || BRTCONFIG.TABLE_TYPE_NONE;
        let tableViewClass = html[0].getElementsByClassName(tableClassName)[0];

        //re-renders, without this the view has a scroll bar and its not sized correctly
        if (tableViewClass) {
            html[0].style.display = 'none';
            html[0].style.display = 'block';
        }

        if (!tableViewClass) { //when the table is updated, the html is different
            if (html[0].getAttribute("class") === tableClassName) {
                tableViewClass = html[0];
            } else {
                console.log(`cannot find table class element ${tableClassName}`);
            }
        }
        // console.log("tableViewClass html ", tableViewClass);

        let divElement = document.createElement("div");
        let brtData = duplicate(tableEntity.data.flags);
        brtData.disabled = !rollTable.editable;
        let selectTypeHtml = await renderTemplate("modules/better-rolltables/templates/select-table-type.hbs", brtData);
        divElement.innerHTML = selectTypeHtml;

        tableViewClass.addEventListener('drop', async function (event) {
            await dropEventOnTable(event, tableEntity);
        });

        tableViewClass.insertBefore(divElement, tableViewClass.children[2]);

        const selectTypeElement = divElement.getElementsByTagName("select")[0];
        selectTypeElement.onchange = async function () { await BetterRT.onOptionTypeChanged(selectTypeElement.value, tableEntity); };


        /** If we use default table, we stop here */
        if (selectedTableType === BRTCONFIG.TABLE_TYPE_NONE) return;

        /**for every result, add an input field before the text to add a formula */

        console.log("selectTypeElement ", selectTypeElement);
        console.log("tableViewClass html ", tableViewClass);
        const tableResultsHTML = tableViewClass.getElementsByClassName("table-result");

        console.log("tableResultHTML  ", tableResultsHTML);
        let index = 0;
        for (let resultHTML of tableResultsHTML) {
            const resultId = resultHTML.getAttribute("data-result-id");
            if (resultId) {

                console.log("resultId  ", resultId);
                const tableResult = tableEntity.getEmbeddedEntity("TableResult", resultId);

                console.log("tableResult  ", tableResult);
                // const formulaValue = getProperty(tableResult, `flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.RESULTS_FORMULA_KEY}.formula`);
                // console.log("formulaValue  ", formulaValue);

                const detailsHTML = resultHTML.getElementsByClassName("result-details")[0];
                const inputsHTML = detailsHTML.getElementsByTagName("input");
                // console.log("inputsHTML  ", inputsHTML);
                for (let tableText of inputsHTML) {
                    if (tableText.getAttribute("type") == "text") {
                        /** tableText is for each row the text of the table */

                        const formulaInput = document.createElement("input");
                        formulaInput.classList.add("result-brt-formula");
                        formulaInput.placeholder = "formula";
                        formulaInput.type = "text";
                        formulaInput.value = getProperty(tableResult, `flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.RESULTS_FORMULA_KEY}.formula`) || "";
                        /** based on the name of the elents the value will be added in the preUpdateRollTable and override the table.data */
                        formulaInput.name = `results.${index}.flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.RESULTS_FORMULA_KEY}.formula`;
                        if (tableText.classList.contains("result-target")) {
                            tableText.classList.add("result-target-short");
                        } else {
                            tableText.classList.add("result-target-mid");
                        }
                        detailsHTML.insertBefore(formulaInput, tableText);
                        // console.log("tableText  ", tableText);
                        break;
                    }
                }
                // console.log("detailsHTML  ", detailsHTML);

                index++;
            }

        }

        const footer = html[0].getElementsByClassName("sheet-footer flexrow")[0];
        const newRollButton = BetterRT.replaceRollButton(footer);

        /** change footer with new click event on rolls */
        switch (selectedTableType) {
            case BRTCONFIG.TABLE_TYPE_LOOT:
                newRollButton.getElementsByTagName("i")[0].className = "fas fa-gem";
                newRollButton.onclick = async function () { await game.betterTables.generateChatLoot(tableEntity); };

                /** Create additional Button to Generate Loot */
                await BetterRT.showGenerateLootButton(footer, tableEntity);

                /** Hide the element with displayRoll checkbox */
                const inputElements = html[0].getElementsByTagName("input");
                const displayRollElement = inputElements.namedItem("displayRoll").parentElement;

                displayRollElement.remove();
                break;
            case BRTCONFIG.TABLE_TYPE_STORY:
                newRollButton.getElementsByTagName("i")[0].className = "fas fa-book";
                newRollButton.onclick = async function () { await game.betterTables.generateChatStory(tableEntity); };
                break;

            case BRTCONFIG.TABLE_TYPE_BETTER:
                console.log("newRollButton", newRollButton.innerHTML);
                // newRollButton.getElementsByTagName("i")[0].className = "fas fa-dice";
                newRollButton.innerHTML = `<i class ="fas fa-dice-d20"></i> Roll+`;
                newRollButton.onclick = async function () { await game.betterTables.betterTableRoll(tableEntity); };
                break;
        }
    }

    static replaceRollButton(footer) {
        const rollButton = footer.getElementsByClassName("roll")[0];
        //remove the default listener by cloning the button
        const rollButtonClone = rollButton.cloneNode(true);
        rollButton.parentNode.replaceChild(rollButtonClone, rollButton);
        return rollButtonClone;
    }

    static preUpdateRollTable(tableEntity, updateData, diff, tableId) {
        setProperty(updateData, `flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.LOOT_CURRENCY_KEY}`, updateData["currency-input"]);
        setProperty(updateData, `flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.ACTOR_NAME_KEY}`, updateData["loot-name-input"]);
        setProperty(updateData, `flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.ROLLS_AMOUNT_KEY}`, updateData["loot-rolls-amount-input"]);
    }

    static async showGenerateLootButton(htmlElement, tableEntity) {
        const generateLootBtn = document.createElement("button");
        generateLootBtn.setAttribute("class", "generate");
        generateLootBtn.setAttribute("type", "button");

        generateLootBtn.innerHTML = `<i id="BRT-gen-loot" class="fas fa-coins"></i> ${i18n('BRT.GenerateLoot.Button')}`;
        generateLootBtn.onclick = async function () { await game.betterTables.generateLoot(tableEntity); };
        htmlElement.insertBefore(generateLootBtn, htmlElement.firstChild);
    }

    static async onOptionTypeChanged(value, tableEntity) {
        await tableEntity.setFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.TABLE_TYPE_KEY, value);
    }
}