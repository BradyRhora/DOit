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
        this.calendar_body.innerHTML = "";
        this.calendar_body.appendChild(weekRow);

        this.buildCalendar(weekOffset);
        this.loadTasks();
        
        this.getDayElementByDate(new Date())?.classList.add("current-day");
    }

    buildCalendar(weekOffset) {
        let today = new Date();
        let startOfWeek = getStartOfWeek(today);
        startOfWeek.setDate(startOfWeek.getDate() + (weekOffset * 7));

        for (var w = 0; w < 3; w++) {
            let days = [];
            let new_week = document.createElement("tr");
            for (var i = 0; i < 7; i++) {
                // Create the day elements
                let day_elem = document.createElement("td");
                day_elem.classList.add("cal-day");
                
                // Get date offsets
                var currDate = new Date(startOfWeek);
                currDate.setDate(currDate.getDate() + i + (w * 7));

                days.push({"element":day_elem, "date":currDate});

                // Create date header
                var day_num_text = document.createElement("h4");

                // create task container
                var task_container = document.createElement("div");
                task_container.classList.add("task-container");

                // Apply text
                let date = currDate.getDate();
                if (date == 1 || (w == 0 && i == 0)) day_num_text.innerHTML = moment(currDate).format("MMM D");
                else day_num_text.innerHTML = currDate.getDate();

                // Add to the DOM
                new_week.appendChild(day_elem);
                day_elem.appendChild(day_num_text);
                day_elem.appendChild(task_container);
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

            // add new tasks
            for (var task of data) {
                let date = new Date(task.dueDateTime);
                let pastDate = new Date() > date;
                let day = calendar.getDayElementByDate(date);

                // Elements no longer exist because of scroll
                if (!day) return;

                let task_elem = document.createElement("div");

                task_elem.setAttribute("data-id", task._id);
                task_elem.setAttribute("data-toggle", "tooltip");
                task_elem.setAttribute("data-placement", "top");
                task_elem.setAttribute("title", task.notes);

                task_elem.classList.add("task");
                if (pastDate) task_elem.classList.add("past");

                let time_format = "h";
                if (date.getMinutes() != 0) time_format += ":mm";
                time_format += " A";

                task_elem.innerHTML = `
                    <b>${task.name}</b><br>
                    <p>${moment(date).format(time_format)}</p>
                `;
                task_elem.style.backgroundColor = task.colorHex;

                let r = parseInt(task.colorHex.substr(1,2), 16);
                let g = parseInt(task.colorHex.substr(3,2), 16);
                let b = parseInt(task.colorHex.substr(5,2), 16);
                
                if ((r*0.299 + g*0.587 + b*0.114) > 140)
                    task_elem.style.color = '#000000';
                else
                    task_elem.style.color = '#FFFFFF';

                day.children[1].appendChild(task_elem);
            }
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

function taskClickHandler(event) {
    event.stopPropagation();
    let id = event.currentTarget.getAttribute("data-id");
    $.get("/api/task/" + id, function(task) {
        $("#task-form").attr("data-id", id);

        $("#task-name").val(task.name);
        $("#task-color").val(task.colorHex);
        $("#task-date").val(moment(task.dueDateTime).format('yyyy-MM-DD'));
        $("#task-time").val(moment(task.dueDateTime).format('HH:mm'));
        $("#task-notes").val(task.notes);
        $("#new-task-modal").modal("show");

        $("#modal-submit").html("Save Changes");
        $("#new-task-modal .modal-title").html("Edit Task");
        $("#new-task-modal #modal-delete").css("display", "block");
    });
}

function dayClickHandler(event) {
    var date;
    if (event.currentTarget.id == "new-task") 
        date = new Date();
    else
        date = calendar.getDateByDayNumber(event.currentTarget.children[0].innerHTML);

    $("#task-form").removeAttr("data-id");
    
    $('#task-name').val('');
    $('#task-notes').val('');        
    $('#task-color').val('#'+Math.floor(Math.random()*16777215).toString(16));
    $('#task-time').val(moment().format('HH:mm'));
    $("#new-task-modal").modal("show");
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

var calendar, currentDay;
$(document).ready(function() {
    calendar = new Calendar();

    $(document).on("click", ".cal-day", dayClickHandler);
    $(document).on("click", "#new-task", dayClickHandler);
    $(document).on("click", ".task", taskClickHandler);
    $(document).on("click", "#modal-delete", deleteTaskClickHandler);
    $(document).on("click", "#return-today", function() {
        calendar.currentOffset = 0;
        calendar.initCalendar();
        $("#return-today").css("opacity", "0");
    });

    $('[data-toggle="tooltip"]').tooltip()

    // on resize
    setFontSize(calendar);
    $(window).resize(function() {
        setFontSize(calendar);
    });

    // init modal
    $("#task-modal").modal({
        fadeDuration: 100
    });

    $("#task-form").submit(function(e) {
        e.preventDefault();

        let name = $("#task-name").val();
        let color = $("#task-color").val();
        let date = $("#task-date").val();
        let time = $("#task-time").val();
        let notes = $("#task-notes").val();

        let task = {
            name: name,
            color: color,
            date: date,
            time: time,
            notes: notes
        }
        
        let id = "";
        if (e.currentTarget.getAttribute("data-id")) {
            // update existing task
            id = "/" + e.currentTarget.getAttribute("data-id");
        } 

        $.post("/api/task" + id, task, function() {
            $("#new-task-modal").modal("hide");

            //clear form contents
            $("#task-name").val("");
            $("#task-notes").val("");
            // sleep briefly
            setTimeout(function() {
                calendar.loadTasks();
            }, 100);
        });
        
    });

    // scrolling events
    $(document).on("wheel", ".cal-day", function(event) {
        let element = event.currentTarget;
        let taskContainer = element.children[1];

        if (taskContainer.scrollHeight > taskContainer.clientHeight) return;

        let scrollUp = event.originalEvent.deltaY < 0;
        let weekOffset = scrollUp ? -1 : 1;
        calendar.currentOffset += weekOffset;
        calendar.initCalendar(calendar.currentOffset);

        $("#return-today").css("opacity", calendar.currentOffset == 0 ?  "0" : "1");
    });

    let currentDay = new Date();
    setInterval(function() {
        let day = new Date();
        if (day.getDate() != currentDay.getDate()) {
            currentDay = day;
            calendar.initCalendar(calendar.currentOffset);
        }
    }, 1000 * 10);
});