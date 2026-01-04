class Calendar {
    constructor() {
        this.calendar_body = $("#calendar-body")[0];
        this.headers = $("#weekdays")[0];
        this.currentOffset = 0;

        this.initCalendar();
    }

    initCalendar(weekOffset = 0) {
        this.weeks = []
        let weekRow = this.calendar_body.children[0];
        $('.task').tooltip('dispose');
        this.calendar_body.innerHTML = "";
        this.calendar_body.appendChild(weekRow);

        this.buildCalendar(weekOffset);
        this.loadTasks();
        
        this.getDayElementByDate(new Date())?.classList.add("current-day");
    }

    buildCalendar(weekOffset) {
        let WEEK_COUNT = 3;
        let DAYS_PER_WEEK = 7;

        let today = new Date();
        let startOfWeek = getStartOfWeek(today);
        startOfWeek.setDate(startOfWeek.getDate() + (weekOffset * DAYS_PER_WEEK));

        for (var w = 0; w < WEEK_COUNT; w++) {
            let days = [];
            let new_week = document.createElement("tr");
            for (var i = 0; i < DAYS_PER_WEEK; i++) {
                // Create the day elements
                let day_elem = document.createElement("td");
                day_elem.classList.add("cal-day");
                
                // Get date offsets
                var currDate = new Date(startOfWeek);
                currDate.setDate(currDate.getDate() + i + (w * DAYS_PER_WEEK));

                days.push({"element":day_elem, "date":currDate});

                // Create date header
                var day_num_text = document.createElement("h4");

                // create task container
                var task_container = document.createElement("div");
                task_container.classList.add("task-container");
                task_container.classList.add('hide-scroll')


                // Apply text
                let date = currDate.getDate();
                if (date == 1 || (w == 0 && i == 0)) day_num_text.innerHTML = moment(currDate).format("MMM D");
                else day_num_text.innerHTML = currDate.getDate();

                // Add to the DOM
                new_week.appendChild(day_elem);
                day_elem.appendChild(day_num_text);
                day_elem.appendChild(task_container);

                // Scroll event
                day_elem.addEventListener("wheel", dayScrollHandler, { passive: false });

                this.calendar_body.appendChild(new_week);
            }
            this.weeks.push(days);
        }
    }

    loadTasks() {
        let calendar = this;
        let days = this.weeks.flat();
        let start = days[0].date.toISOString();
        let end = days[days.length - 1].date.toISOString();

        $.get("/api/tasks?start=" + start + "&end=" + end, function(data) {    
            // clear existing tasks
            for (var day of days) {
                day.element.children[1].innerHTML = "";
            }

            let today = new Date();
            // add new tasks
            for (var task of data) {
                let date = new Date(task.dueDateTime);
                let pastDate = today > date;
                let day = calendar.getDayElementByDate(date);

                // Elements no longer exist because of scroll
                if (!day) continue;

                let task_elem = document.createElement("div");

                task_elem.setAttribute("data-id", task._id);
                task_elem.setAttribute("data-name", task.name);
                task_elem.setAttribute("data-color", task.colorHex);
                task_elem.setAttribute("data-date", moment(date).format('yyyy-MM-DD'));
                task_elem.setAttribute("data-time", moment(date).format('HH:mm'));
                task_elem.setAttribute("data-notes", task.notes);
                task_elem.setAttribute("data-group", task.groupID);

                task_elem.setAttribute("data-repeats", task.repeats);
                if (task.repeats) {
                    task_elem.setAttribute("data-repeat-unit", task.repeatOptions.unit);
                    task_elem.setAttribute("data-repeat-number", task.repeatOptions.number);
                    if (task.repeatOptions.originalDueDateTime != undefined) {
                        task_elem.setAttribute("data-original-date", moment(task.repeatOptions.originalDueDateTime).format('yyyy-MM-DD'));
                        task_elem.setAttribute("data-orginal-time", moment(task.repeatOptions.originalDueDateTime).format('HH:mm'));
                    } else {
                        task_elem.setAttribute("data-original-date", moment(date).format('yyyy-MM-DD'));
                        task_elem.setAttribute("data-orginal-time", moment(date).format('HH:mm'));
                    }
                    task_elem.setAttribute("data-repeat-ends", task.repeatOptions.endDate != null);
                    if (task.repeatOptions.endDate != null) {
                        task_elem.setAttribute("data-repeat-end", moment(task.repeatOptions.endDate).format('yyyy-MM-DD'));
                    }
                }

                


                if (task.notes != "") {
                    task_elem.setAttribute("data-toggle", "tooltip");
                    task_elem.setAttribute("data-bs-placement", "bottom");
                    task_elem.setAttribute("title", task.notes);
                    $(task_elem).tooltip({trigger: 'hover'});
                }



                task_elem.classList.add("task");
                if (pastDate) task_elem.classList.add("past");

                let time_format = "h";
                if (date.getMinutes() != 0) time_format += ":mm";
                time_format += " A";

                let task_icon_container = document.createElement("div");
                task_icon_container.classList.add("task-icons");

                if (task.repeats) {
                    let count = task.repeatOptions.number;
                    let unit = task.repeatOptions.unit;

                    if (count == 1) {
                        count = "every";
                        unit = unit.substr(0, unit.length - 1);
                    } else {
                        count = `every ${count}`;
                    }

                    task_icon_container.innerHTML += `<i data-toggle="tooltip" data-bs-placement="bottom" title="Repeats ${count} ${unit}" class="bi bi-arrow-repeat task-repeat-icon"></i>`;
                }

                if (task.notes.length > 0)
                    task_icon_container.innerHTML += `<i class="bi bi-card-text"></i>`;

                task_elem.innerHTML = `
                    <b>${task.name}</b>
                    <div class="task-footer">
                        <p>${moment(date).format(time_format)}</p>
                        ${task_icon_container.outerHTML}
                    </div>
                `;


                // Set foreground color to black or white based on background color
                task_elem.style.backgroundColor = task.colorHex;

                let r = parseInt(task.colorHex.substr(1,2), 16);
                let g = parseInt(task.colorHex.substr(3,2), 16);
                let b = parseInt(task.colorHex.substr(5,2), 16);
                
                task_elem.style.color = ((r*0.299 + g*0.587 + b*0.114) > 140) ? '#000000' : '#FFFFFF';

                day.children[1].appendChild(task_elem);
            }
            
            $(".task-repeat-icon").tooltip({trigger: 'hover'});
        });
    }

    getDateByDayNumber(dayNum) {
        let days = this.weeks.flat();
        for (var i = 0; i < days.length; i++) {
            if (days[i].date.getDate() == dayNum) {
                return days[i].date;
            }
        }
    }

    getDayElementByDate(date) {
        let days = this.weeks.flat();
        for (var i = 0; i < days.length; i++) {
            // if dates match (ignoring time)
            if (days[i].date.toDateString() == date.toDateString()) {
                return days[i].element;
            }
        }
    }

    changeOffset(weekOffset) {        
        calendar.currentOffset += weekOffset;
        calendar.initCalendar(calendar.currentOffset);
        $("#return-today").css("opacity", calendar.currentOffset == 0 ?  "0" : "1");
    }

    // 1 = Shortest (M), 2 = Medium (Mon), 3 = Long (Monday)    
    setHeaderMode(mode) {
        let headers = [
            ["M", "T", "W", "T", "F", "S", "S"],
            ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        ]

        if (mode < 1 || mode > 3) {
            throw "Invalid header mode";
        }

        let headersToUse = headers[mode - 1];
        for (var i = 0; i < 7; i++) {
            this.headers.children[i].innerHTML = headersToUse[i];
        }
    }
}

// Helper Functions

function getStartOfWeek(date) {
    let day = new Date(date);
    while (day.getDay() != 1) {
        day.setDate(day.getDate() - 1);
    }
    return day;
}

function setFontSize(calendar) {
    let width = $(window).width();
    if (width < 400) {
        calendar.setHeaderMode(1);
        document.documentElement.style.setProperty("--cal-font-size", "1rem")
    } else if (width <= 800) {
        calendar.setHeaderMode(2);
        document.documentElement.style.setProperty("--cal-font-size", "1.2rem")
    } else {
        calendar.setHeaderMode(3);
        document.documentElement.style.setProperty("--cal-font-size", "1.5rem")
    }
}

function openTaskModalByID(id) {
    let task = $(`[data-id="${id}"]`)[0];
    taskClickHandler({currentTarget: task});
}

// Event Handlers

function taskClickHandler(event) {
    if (event.target)
        event.stopPropagation();
    let id = event.currentTarget.getAttribute("data-id");
    let name = event.currentTarget.getAttribute("data-name");
    let color = event.currentTarget.getAttribute("data-color");
    let date = event.currentTarget.getAttribute("data-date");
    let time = event.currentTarget.getAttribute("data-time");
    let notes = event.currentTarget.getAttribute("data-notes");
    let repeats = event.currentTarget.getAttribute("data-repeats");

    $("#task-form").attr("data-id", id);

    $("#task-name").val(name);
    $("#task-color").val(color);
    $("#task-date").val(date);
    $("#task-time").val(time);
    $("#task-notes").val(notes);

    if ((event.currentTarget.getAttribute("data-group") != undefined 
            || event.currentTarget.getAttribute("data-group") != null) 
                && event.currentTarget.getAttribute("data-group") != "undefined") {
        $("#task-group-select").val(event.currentTarget.getAttribute("data-group"));
        $("#task-color").attr("disabled", true);
    }
    else {
        $("#task-group-select").val("");
        $("#task-color").attr("disabled", false);
    }

    if (repeats == "true") {
        $('#task-date').val(event.currentTarget.getAttribute("data-original-date"));
        $('#task-time').val(event.currentTarget.getAttribute("data-orginal-time"));
        $("#task-repeating-checkbox").prop("checked", true);
        $("#task-repeating-number").val(event.currentTarget.getAttribute("data-repeat-number"));
        $("#task-repeating-unit").val(event.currentTarget.getAttribute("data-repeat-unit"));
        $("#task-repeating-end-checkbox").prop("checked", event.currentTarget.getAttribute("data-repeat-ends") == "true");
        $("#task-repeating-end-option").val("on-date");
        $("#task-repeating-end-date").val(event.currentTarget.getAttribute("data-repeat-end"));
        $("#task-repeating-end-number").val(event.currentTarget.getAttribute("data-repeat-end"));
    } else {
        $("#task-repeating-checkbox").prop("checked", false);
        $("#task-repeating-number").val(1);
        $("#task-repeating-unit").val("days");
        $("#task-repeating-end-checkbox").prop("checked", false);
        $("#task-repeating-end-option").val("after");
        $("#task-repeating-end-date").val("");
        $("#task-repeating-end-number").val(1);
    }

    toggleRepeatingOptions();
    toggleEndingOptions();
    toggleEndType();

    $("#new-task-modal").modal("show");

    $("#modal-submit").html("Save Changes");
    $("#new-task-modal .modal-title").html("Edit Task");
    $("#new-task-modal #modal-delete").css("display", "block");
}

function dayScrollHandler(event) {

    let element = event.currentTarget;
    let taskContainer = element.children[1];

    if (taskContainer.scrollHeight > taskContainer.clientHeight) return;
    event.preventDefault();

    let scrollUp = event.deltaY < 0;
    let weekOffset = scrollUp ? -1 : 1;
    calendar.changeOffset(weekOffset);    
}

function dayClickHandler(event) {    
    clearTaskForm();

    var date;
    if (event.currentTarget.id == "new-task")
        date = new Date();
    else {
        let dayNumberText = event.currentTarget.children[0].innerHTML;
        const re = /[a-zA-Z ]/g;
        dayNumberText = dayNumberText.replaceAll(re, "");
        date = calendar.getDateByDayNumber(dayNumberText);
    }
    

    $("#task-form").removeAttr("data-id");
         
    $('#task-color').val('#'+Math.floor(Math.random()*16777215).toString(16));

    // round to nearest half hour
    if (moment(date).minutes() < 30) {
        $('#task-time').val(moment(date).format('HH:30'))
    } else {
        date.setHours(date.getHours() + 1);
        $('#task-time').val(moment(date).format('HH:00'))
    }

    $("#task-group-select").val("");
    
    $("#new-task-modal").modal("show");
    
    $('#task-name').focus();
    $("#task-date").val(moment(date).format('yyyy-MM-DD'));
    $("#modal-submit").html("Save Task");
    $("#new-task-modal .modal-title").html("New Task");
    $("#new-task-modal #modal-delete").css("display", "none");
}

function deleteTaskClickHandler(event) {
    let id = $("#task-form").attr("data-id");

    $.ajax({
        url: "/api/task/" + id,
        type: "DELETE",
        success: function() {
            $("#new-task-modal").modal("hide");
            calendar.loadTasks();
        }
    });
}

// Modal Functions

function verifyNumInput(elem) {
    elem = $(elem);
    let val = Number(elem.val());
    let min = Number(elem.attr("min"));
    let max = Number(elem.attr("max"));
    if (val < min) {
        elem.val(min);
    } else if (val > max) {
        elem.val(max);
    }
}

function toggleRepeatingOptions() {
    let repeating = $("#task-repeating-checkbox").is(":checked");
    let options = $("#task-repeating-options-container");
    let endOptions = $("#task-repeating-end-container");

    if (repeating) {
        options.css("display", "flex");
        endOptions.css("display", "block");
    } else {
        options.css("display", "none");
        endOptions.css("display", "none");
    }
}

function toggleEndingOptions() {
    let end = $("#task-repeating-end-checkbox").is(":checked");
    let options = $("#task-repeating-end-options-container");

    if (end) {
        options.css("display", "flex");
    } else {
        options.css("display", "none");
    }

}

function toggleEndType() {
    let type = $("#task-repeating-end-option").val();
    if (!$("#task-repeating-end-checkbox").is(":checked")) type = ""; // If task doesn't end, ensure inputs not required

    let datePicker = $("#task-repeating-end-date");
    let number = $("#task-repeating-end-number-container");

    if (type == "on-date") {
        datePicker.css("display", "block");
        datePicker.attr("required", true);
        number.css("display", "none");
    } else {
        datePicker.css("display", "none");
        datePicker.attr("required", false);
        number.css("display", "flex");
    }
}

function clearTaskForm() {
    //clear form contents
    $("#task-name").val("");
    $("#task-notes").val("");

    // Reset repeating options
    $("#task-repeating-checkbox").prop("checked", false);
    $("#task-repeating-number").val(1);
    $("#task-repeating-unit").val("days");

    // Reset end options
    $("#task-repeating-end-checkbox").prop("checked", false);
    $("#task-repeating-end-option").val("after");
    $("#task-repeating-end-date").val("");
    $("#task-repeating-end-number").val(1);

    toggleRepeatingOptions();
    toggleEndingOptions();
    toggleEndType();
}

function initializeExtensionCheckStates() {    
    $.get("/api/user/extensions", function(extensions) {
        for (userExtension of extensions) {
            $('[di-extension-id="'+userExtension.extensionID+'"]').prop('checked', userExtension.enabled);
        }
    });
}

function retrieveExtensions() {
    $.get("/api/extension", function(extensions) {
        let extensionElements = extensions.map((ext) => {
            return `
            <tr>
                <td><b>${ext.name}</b></td>
                <td>${ext.description}</td>
                <td><input type="checkbox" di-extension-id="${ext._id}" class="extension-toggler"></input></td>
            </tr>
            `;
        })

        let tableBody = $("#extension-table-body");
        tableBody.empty();
        tableBody.append(extensionElements.join("\n"));
        initializeExtensionCheckStates();
    });
}

function openExtensionsModal() {
    retrieveExtensions();
    $("#extension-menu-modal").modal("show");
}

var refreshButtonVisible = false;
function extensionCheckboxToggled() {
    const newState = this.checked;
    const eId = $(this).attr('di-extension-id');
    
    fetch("/api/user/extension", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({extensionId: eId, state: newState})
    }).then(response => {
        if (response.status == 200 && refreshButtonVisible == false) {
            refreshButtonVisible = true;
            $("#extensionRefreshPageButton").css("display", "block");
        }
    });
}

var calendar, currentDay;
$(document).ready(function() {
    calendar = new Calendar();
    // initialization functions
    setFontSize(calendar);

    // event handlers
    $(document).on("click", ".cal-day", dayClickHandler);
    $(document).on("click", "#new-task", dayClickHandler);
    $(document).on("click", ".task", taskClickHandler);
    $(document).on("click", "#modal-delete", deleteTaskClickHandler);
    $(document).on("click", "#return-today", function() {
        calendar.currentOffset = 0;
        calendar.initCalendar();
        $("#return-today").css("opacity", "0");
    });
    $(document).on("change", "#task-group-select", function() {
        if (this.value == "new") {
            let modal = $("#new-group-modal");
            modal.modal("show");
            let backdrop = $(".modal-backdrop").last();
            
            $("#group-color").val($("#task-color").val());
            backdrop.css("z-index", 1800);
            modal.css("z-index", 1801)
            this.value = "";
        } else if (this.value == "") {
            $("#task-color").attr("disabled", false);
        } else {
            $("#task-color").attr("disabled", true);
            $("#task-color").val($("#task-group-select option:selected").attr("color"));
        }
    });
    $(document).on("click", "#extension-menu-button", openExtensionsModal);
    $(document).on("click", ".extension-toggler", extensionCheckboxToggled);

    // on resize
    $(window).resize(function() {
        setFontSize(calendar);
    });

    // form submits
    $("#task-form").submit(function(e) {
        e.preventDefault();

        let name = $("#task-name").val();
        let color = $("#task-color").val();
        let date = $("#task-date").val();
        let time = $("#task-time").val();
        let notes = $("#task-notes").val();
        let repeating = $("#task-repeating-checkbox").is(":checked");


        let task = {
            name: name,
            color: color,
            date: date,
            time: time,
            notes: notes,
            repeating: repeating
        }

        if ($("#task-group-select").val() != "") {
            task.groupID = $("#task-group-select").val();
        }

        if (repeating) {
            let repeatNumber = $("#task-repeating-number").val();
            let repeatUnit = $("#task-repeating-unit").val();
            let ending = $("#task-repeating-end-checkbox").is(":checked");

            task.repeatOptions = {
                number: repeatNumber,
                unit: repeatUnit
            }

            if (ending) {
                let endType = $("#task-repeating-end-option").val();
                let endTime = moment('1970-01-01 ' + $("#task-time").val());
                let endDate;

                if (endType == "on-date") {
                    endDate = moment($("#task-repeating-end-date").val()).toDate();
                } else {
                    let times = $("#task-repeating-end-number").val();
                    times *= repeatNumber;

                    endDate = moment(date).add(times - 1, repeatUnit).toDate();
                }

                endDate.setHours(endTime.hours());
                endDate.setMinutes(endTime.minutes());

                task.repeatOptions.endDate = endDate;
            }
        }

        let id = "";
        if (e.currentTarget.getAttribute("data-id")) {
            // update existing task
            id = "/" + e.currentTarget.getAttribute("data-id");
        } 

        $.post("/api/task" + id, task, function() {
            $("#new-task-modal").modal("hide");

            // sleep briefly to allow for database update
            setTimeout(function() {
                calendar.loadTasks();
            }, 100);
        });
        
    });

    $("#group-form").submit(function(e) {
        e.preventDefault();

        let name = $("#group-name").val();
        let color = $("#group-color").val();

        let group = {
            name: name,
            color: color
        }
        
        $.post("/api/group", group, function(response) {
            $("#new-group-modal").modal("hide");

            //clear form contents
            $("#group-name").val("");
            $("#group-color").val("#000000");
            
            // append BEFORE "new group" option
            $("#task-group-select option:nth-last-child(2)").before(`
                <option color="${color}" value="${response._id}">${name}</option>
            `);
        });
        
    });
    
    // Auto update calendar
    let currentDay = new Date();
    setInterval(function() {
        let day = new Date();
        if (day.getDate() != currentDay.getDate()) {
            currentDay = day;
            calendar.initCalendar(calendar.currentOffset);
        }
    }, 1000 * 10);
});