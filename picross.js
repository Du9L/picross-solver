"use strict";

let $ = window.jQuery;

let loadPuzzle = function () {
    let new_puzzle = {
        rows: 0,
        cols: 0,
        row_keys: [],
        col_keys: [],
    };
    let all_rows = $('#puzzle tbody > tr');
    new_puzzle.rows = all_rows.length - 1;
    // load row keys
    for (let r = 1; r < all_rows.length; ++r) {
        let key_cell = $(all_rows[r]).find('.key').first();
        let keys = [];
        $(key_cell).find('strong').each( (index, element) => {
            keys.push(parseInt($(element).text()));
        });
        new_puzzle.row_keys.push(keys);
    }
    let all_cols = $($('#puzzle tbody > tr').first()).find('td');
    new_puzzle.cols = all_cols.length - 1;
    // load col keys
    for (let c = 1; c < all_cols.length; ++c) {
        let key_cell = all_cols[c];
        let keys = [];
        $(key_cell).find('strong').each( (index, element) => {
            keys.push(parseInt($(element).text()));
        });
        new_puzzle.col_keys.push(keys);
    }

    return new_puzzle;
}

let solvePuzzle = function (puzzle) {
    // initial state
    let STATE_UNKNOWN = 'UNKNOWN', STATE_ON = 'ON', STATE_OFF = 'OFF';
    let state = [];
    for (let r = 0; r < puzzle.rows; ++r) {
        let row_state = [];
        for (let c = 0; c < puzzle.cols; ++c) {
            row_state.push(STATE_UNKNOWN);
        }
        state.push(row_state);
    }
    // initial queue
    let TASK_ROW = 'ROW', TASK_COL = 'COL';
    let task_set = new Set();
    let row_tasks = [], col_tasks = [];
    for (let r = 0; r < puzzle.rows; ++r) {
        let task = [TASK_ROW, r];
        row_tasks.push(task);
        task_set.add(task);
    }
    for (let c = 0; c < puzzle.cols; ++c) {
        let task = [TASK_COL, c];
        col_tasks.push(task);
        task_set.add(task);
    }
    // start searching
    while (task_set.size != 0) {
        let new_tasks = new Set();

        // run each task
        for (const task of task_set.values()) {
            let task_type = task[0], row_or_col = task[1];
            console.info('Run task', task_type, row_or_col);
            // task data
            let initial_state, keys;
            if (task_type == TASK_ROW) {
                initial_state = state[row_or_col].slice();
                keys = puzzle.row_keys[row_or_col];
            } else {
                initial_state = [];
                for (const row_state of state) {
                    initial_state.push(row_state[row_or_col]);
                }
                keys = puzzle.col_keys[row_or_col];
            }
            
            // search function: 
            // [valid solution] {kth cell: [possible states]} | [invalid solution] null = 
            //   search ( keys since X, cells since Y )
            let searchFunction = function (keys_since, cells_since) {
                // edge: no more keys to fulfill, set rest cells to OFF
                if (keys_since >= keys.length) {
                    let ret = {};
                    for (let cell = cells_since; cell < initial_state.length; ++cell) {
                        if (initial_state[cell] == STATE_UNKNOWN) {
                            ret[cell] = [STATE_OFF];
                        } else if (initial_state[cell] == STATE_ON) {
                            return null;
                        }
                    }
                    return ret;
                }
                // edge: no more cells to use, return invalid
                if (cells_since >= initial_state.length) {
                    return null;
                }
                // if current cell is OFF, skip to next ON or UNKNOWN cell
                let state = initial_state[cells_since];
                if (state == STATE_OFF) {
                    while (++cells_since < initial_state.length) {
                        if (initial_state[cells_since] != STATE_OFF) {
                            return searchFunction(keys_since, cells_since);
                        }
                    }
                    return null;
                }
                // if current cell is ON, try to fill the rest of current key
                if (state == STATE_ON) {
                    let current_key = keys[keys_since];
                    if (cells_since + current_key > initial_state.length) {
                        return null;
                    }
                    for (let cell = cells_since; cell < cells_since + current_key; ++cell) {
                        if (initial_state[cell] == STATE_OFF) {
                            return null;
                        }
                    }
                    if (cells_since + current_key < initial_state.length && 
                            initial_state[cells_since + current_key] == STATE_ON) {
                        return null;
                    }
                    let start_point = cells_since + current_key + 1;
                    if (start_point > initial_state.length) {
                        -- start_point;
                    }
                    let sub_result = searchFunction(keys_since+1, start_point);
                    if (sub_result === null) {
                        return null;
                    }
                    let ret = {};
                    // set current key cells
                    for (let cell = cells_since; cell < cells_since + current_key + 1; ++cell) {
                        if (cell >= initial_state.length || initial_state[cell] != STATE_UNKNOWN) {
                            continue;
                        }
                        let new_value = (cell == cells_since + current_key) ? STATE_OFF : STATE_ON;
                        ret[cell] = [new_value];
                    }
                    // merge with the sub-result
                    for (const cell in sub_result) {
                        if (!sub_result.hasOwnProperty(cell)) {
                            continue;
                        }
                        if (cell in ret) {
                            for (const val of sub_result[cell]) {
                                if (!ret[cell].includes(val)) {
                                    ret[cell].push(val)
                                }
                            }
                        } else {
                            ret[cell] = sub_result[cell];
                        }
                    }
                    return ret;
                }
                // state == UNKNOWN, try two different states and merge the result
                let ret = null;
                // - first try OFF
                let sub_result = searchFunction(keys_since, cells_since+1);
                if (sub_result !== null) {
                    ret = sub_result;
                    ret[cells_since] = [STATE_OFF];
                }
                // - then try ON, similar to above
                let current_key = keys[keys_since];
                if (cells_since + current_key <= initial_state.length) {
                    // check if ON is possible
                    let valid = true;
                    for (let cell = cells_since; cell < cells_since + current_key; ++cell) {
                        if (initial_state[cell] == STATE_OFF) {
                            valid = false;
                            break;
                        }
                    }
                    if (valid && cells_since + current_key < initial_state.length && 
                            initial_state[cells_since + current_key] == STATE_ON) {
                        valid = false;
                    }
                    if (valid) {
                        let start_point = cells_since + current_key + 1;
                        if (start_point > initial_state.length) {
                            -- start_point;
                        }
                        let sub_result = searchFunction(keys_since+1, start_point);
                        if (sub_result !== null) {
                            if (ret === null) {
                                ret = {};
                            }
                            // set current key cells
                            for (let cell = cells_since; cell < cells_since + current_key + 1; ++cell) {
                                if (cell >= initial_state.length || initial_state[cell] != STATE_UNKNOWN) {
                                    continue;
                                }
                                let new_value = (cell == cells_since + current_key) ? STATE_OFF : STATE_ON;
                                if (cell in ret) {
                                    if (!ret[cell].includes(new_value)) {
                                        ret[cell].push(new_value)
                                    }
                                } else {
                                    ret[cell] = [new_value];
                                }
                            }
                            // merge with the sub-result
                            for (const cell in sub_result) {
                                if (!sub_result.hasOwnProperty(cell)) {
                                    continue;
                                }
                                if (cell in ret) {
                                    for (const val of sub_result[cell]) {
                                        if (!ret[cell].includes(val)) {
                                            ret[cell].push(val)
                                        }
                                    }
                                } else {
                                    ret[cell] = sub_result[cell];
                                }
                            }
                        }
                    }
                }
                return ret;
            }
            // end of search function

            let ret = searchFunction(0, 0);
            if (ret === null) {
                console.error("A search returned null!!", task_type, row_or_col);
            } else {
                // check for cells with only one solution
                for (let cell in ret) {
                    if (!ret.hasOwnProperty(cell)) {
                        continue;
                    }
                    const val = ret[cell];
                    cell = parseInt(cell);
                    if (val.length == 0) {
                        console.error("Search function returned empty array!!", val);
                    }
                    else if (val.length == 1) {
                        let row, col;
                        if (task_type == TASK_ROW) {
                            if (state[row_or_col][cell] != STATE_UNKNOWN) {
                                throw "Search function returned known cell";
                            }
                            state[row_or_col][cell] = val[0];
                            new_tasks.add(col_tasks[cell]);
                            row = row_or_col; col = cell;
                        } else {
                            if (state[cell][row_or_col] != STATE_UNKNOWN) {
                                throw "Search function returned known cell";
                            }
                            state[cell][row_or_col] = val[0];
                            new_tasks.add(row_tasks[cell]);
                            row = cell; col = row_or_col;
                        }
                        console.info("Found solution!!", row, col, val[0]);
                        let obj = $($('#puzzle tbody > tr')[row + 1]).find('td')[col + 1];
                        let _which = (val[0] == STATE_ON) ? 1 : 3;
                        $(obj).trigger(
                            {type: 'mousedown', target: obj, which: _which}
                        ).trigger(
                            {type: 'mouseup', target: obj, which: _which}
                        );
                    }
                }
            }
        }

        // check if it's all solved
        let solved = true;
        for (const row_state of state) {
            for (const col_value of row_state) {
                if (col_value == STATE_UNKNOWN) {
                    solved = false;
                    break;
                }
            }
            if (!solved) {
                break;
            }
        }
        if (solved) {
            console.info('all solved!!');
            break;
        }

        // append new tasks
        console.info('====== next round ======')
        task_set.clear();
        for (const new_task of new_tasks.values()) {
            console.info('task:', new_task);
            task_set.add(new_task);
        }
    }
}

let addSolveButton = function () {
    let container = $('.controls .control-group').first();
    let button = $('<button>Auto solve</button>');
    button.mouseup(function() {
        let puzzle = loadPuzzle();
        console.info(puzzle);
        solvePuzzle(puzzle);
    });
    button.appendTo(container);
}

window.addEventListener('load', addSolveButton, false);