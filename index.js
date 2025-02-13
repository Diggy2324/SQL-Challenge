const { Pool } = require('pg');
const inquirer = require('inquirer');
require('console.table');

// Database connection (using environment variables is HIGHLY recommended)
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'employee_tracker',
  password: process.env.DB_PASSWORD || 'Lemonlime46', // NEVER hardcode passwords in production
  port: process.env.DB_PORT || 5432,
});

async function initializeDB() { // Placed at the top
  try {
    // ... your database initialization code
  } catch (dbInitErr) { /* ... */ }
}

async function ViewAllDepartments() {
  try {
    const result = await pool.query('SELECT * FROM department');
    console.table(result.rows);
  } catch (err) {
    console.error("Error viewing departments:", err);
  }
}

async function ViewAllRoles() {
  try {
    const result = await pool.query(`
      SELECT role.id, role.title, role.salary, department.name AS department
      FROM role
      INNER JOIN department ON role.department_id = department.id
    `);
    console.table(result.rows);
  } catch (err) {
    console.error("Error viewing roles:", err);
  }
}

async function ViewAllManagers() {
  try {
    const result = await pool.query(`
      SELECT e.id, e.first_name, e.last_name, role.title, role.salary, department.name AS department, COALESCE(m.first_name || ' ' || m.last_name, 'N/A') AS manager
      FROM employee e
      INNER JOIN role ON e.role_id = role.id
      INNER JOIN department ON role.department_id = department.id
      LEFT JOIN employee m ON e.manager_id = m.id
    `);
    console.table(result.rows);
  } catch (err) {
    console.error("Error viewing managers:", err);
  }
}

async function ViewAllEmployees() {
  try {
    const result = await pool.query(`
      SELECT e.id, e.first_name, e.last_name, role.title, role.salary, department.name AS department, COALESCE(m.first_name || ' ' || m.last_name, 'N/A') AS manager
      FROM employee e
      INNER JOIN role ON e.role_id = role.id
      INNER JOIN department ON role.department_id = department.id
      LEFT JOIN employee m ON e.manager_id = m.id
    `);
    console.table(result.rows);
  } catch (err) {
    console.error("Error viewing employees:", err);
  }
}

async function AddDepartment() {
  try {
    const { name } = await inquirer.prompt({
      type: 'input',
      name: 'name',
      message: 'Enter the name of the new department:',
    });
    await pool.query('INSERT INTO department (name) VALUES ($1)', [name]);
    console.log(`Department Added! "${name}"`);
  } catch (err) {
    console.error("Error adding department:", err);
  }
}

async function AddRole() {
  try {
    const departments = await pool.query('SELECT * FROM department');
    const { title, salary, department_id } = await inquirer.prompt([
      { type: 'input', name: 'title', message: 'Enter the title of the new role:' },
      { type: 'number', name: 'salary', message: 'Enter the salary of the new role:' },
      {
        type: 'list',
        name: 'department_id',
        message: 'Select the department for the new role:',
        choices: departments.rows.map(department => ({ name: department.name, value: department.id })),
      },
    ]);
    await pool.query('INSERT INTO role (title, salary, department_id) VALUES ($1, $2, $3)', [title, salary, department_id]);
    console.log(`Role Added! "${title}"`);
  } catch (err) {
    console.error("Error adding role:", err);
  }
}

async function AddManager() {
  try {
    // 1. Fetch Roles (Same as in AddEmployee)
    const roles = await pool.query('SELECT * FROM role');
    const employees = await pool.query('SELECT * FROM employee'); //Get the list of employees for the manager selection

    const { first_name, last_name, role_id, manager_id } = await inquirer.prompt([
      { type: 'input', name: 'first_name', message: "Enter the manager's first name:" },
      { type: 'input', name: 'last_name', message: "Enter the manager's last name:" },
      { //Prompt for a manager, if the role is not manager, allow null
        type: 'list',
        name: 'manager_id',
        message: "Select the manager's manager (or leave blank):",
        choices: [{name: 'Peter', value: 'Crows'}, ...employees.rows.map(employee => ({ name: employee.first_name + ' ' + employee.last_name, value: employee.id }))],
      },
    ]);

    // 2. Parameterized Query (Essential!)
    const query = `INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)`; 
    const values = [first_name, last_name, role_id, manager_id];

    console.log("SQL Query:", query);  // Log query (without values)
    console.log("Values:", values);      // Log values separately

    const result = await pool.query(query, values);
    console.log("Manager added:", result.rows);

  } catch (error) {
    console.error("Error adding manager:", error);
    throw error;
  }
}

async function getEmployeeInput() {  // New reusable function
  const roles = await pool.query('SELECT * FROM role');
  const employees = await pool.query('SELECT * FROM employee'); // Fetch employees for manager selection

  return inquirer.prompt([
    { type: 'input', name: 'first_name', message: 'Enter the first name:' },
    { type: 'input', name: 'last_name', message: 'Enter the last name:' },
    {
      type: 'list',
      name: 'role_id',
      message: 'Select the role:',
      choices: roles.rows.map(role => ({ name: role.title, value: role.id })),
    },
    {
      type: 'list',
      name: 'manager_id',
      message: 'Select the manager (or None):',
      choices: [{ name: 'None', value: null }, ...employees.rows.map(employee => ({ name: `${employee.first_name} ${employee.last_name}`, value: employee.id }))],
    },
  ]);
}


async function AddEmployee() {
  try {
    const employeeData = await getEmployeeInput(); // Call the reusable function
    const { first_name, last_name, role_id, manager_id } = employeeData; // Destructure

    await pool.query('INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)', [first_name, last_name, role_id, manager_id]);
    console.log(`Employee Added! "${first_name} ${last_name}"`);
  } catch (err) {
    console.error("Error adding employee:", err);
  }
}

// Example Update Employee Function (Illustrative)
async function UpdateEmployee(employeeId) {
  try {
    const employeeData = await getEmployeeInput(); // Reuse the input function!
    const { first_name, last_name, role_id, manager_id } = employeeData;

    // Build your UPDATE query here, using employeeId and the new data
    const query = `UPDATE employee SET first_name = $1, last_name = $2, role_id = $3, manager_id = $4 WHERE id = $5`;
    const values = [first_name, last_name, role_id, manager_id, employeeId];

    await pool.query(query, values);
    console.log(`Employee updated!`);
  } catch (err) {
    console.error("Error updating employee:", err);
  }
}

async function UpdateEmployeeRole() {
  try {
    const employees = await pool.query('SELECT * FROM employee');
    const roles = await pool.query('SELECT * FROM role');

    const { employee_id, role_id } = await inquirer.prompt([
      {
        type: 'list',
        name: 'employee_id',
        message: 'Select the employee to update:',
        choices: employees.rows.map(e => ({ name: `${e.first_name} ${e.last_name}`, value: e.id })),
      },
      {
        type: 'list',
        name: 'role_id',
        message: 'Select the new role:',
        choices: roles.rows.map(r => ({ name: r.title, value: r.id })),
      },
    ]);

    await pool.query('UPDATE employee SET role_id = $1 WHERE id = $2', [role_id, employee_id]);
    console.log('Employee role updated!');
  } catch (error) {
    console.error("Error updating employee role:", error);
  }
}

async function UpdateEmployeeManager() {
  try {
    const employees = await pool.query('SELECT * FROM employee');
    const managers = await pool.query('SELECT * FROM employee');

    const { employee_id, manager_id } = await inquirer.prompt([
      {
        type: 'list',
        name: 'employee_id',
        message: 'Select the employee to update:',
        choices: employees.rows.map(e => ({ name: `${e.first_name} ${e.last_name}`, value: e.id })),
      },
      {
        type: 'list',
        name: 'manager_id',
        message: 'Select the new manager:',
        choices: managers.rows.map(m => ({ name: `${m.first_name} ${m.last_name}`, value: m.id })),
      },
    ]);
    
    await pool.query('UPDATE employee SET manager_id = $1 WHERE id = $2', [manager_id, employee_id]);
    console.log('Employee manager updated!');
  } catch (error) {
    console.error("Error updating employee manager:", error);
  }
}

async function DeleteManager() {
  try {
    const managers = await pool.query('SELECT * FROM employee WHERE role_id = 1');
    const { manager_id } = await inquirer.prompt([
      {
        type: 'list',
        name: 'manager_id',
        message: 'Select the manager to delete:',
        choices: managers.rows.map(m => ({ name: `${m.first_name} ${m.last_name}`, value: m.id })),
      },
    ]);

    // Check if any employees have this manager before deleting
    const employeesWithManager = await pool.query('SELECT * FROM employee WHERE manager_id = $1', [manager_id]);
    if (employeesWithManager.rows.length > 0) {
      console.log("Cannot delete manager. Employees are currently assigned to this manager. Update employees first.");
      return;
    }

    await pool.query('DELETE FROM employee WHERE id = $1', [manager_id]);
    console.log('Manager deleted!');
  } catch (error) {
    console.error("Error deleting manager:", error);
  }
}

async function DeleteEmployee() {
  try {
    const employees = await pool.query('SELECT * FROM employee');
    const { employee_id } = await inquirer.prompt([
      {
        type: 'list',
        name: 'employee_id',
        message: 'Select the employee to delete:',
        choices: employees.rows.map(e => ({ name: `${e.first_name} ${e.last_name}`, value: e.id })),
      },
    ]);

    await pool.query('DELETE FROM employee WHERE id = $1', [employee_id]);
    console.log('Employee deleted!');
  } catch (error) {
    console.error("Error deleting employee:", error);
  }
}

async function DeleteRole() {
  try {
    const roles = await pool.query('SELECT * FROM role');
    const { role_id } = await inquirer.prompt([
      {
        type: 'list',
        name: 'role_id',
        message: 'Select the role to delete:',
        choices: roles.rows.map(r => ({ name: r.title, value: r.id })),
      },
    ]);

    // Check if any employees have this role before deleting (important for data integrity)
    const employeesWithRole = await pool.query('SELECT * FROM employee WHERE role_id = $1', [role_id]);
    if (employeesWithRole.rows.length > 0) {
      console.log("Cannot delete role. Employees are currently assigned to this role.  Update employee roles first.");
      return; // Or handle this differently (e.g., reassign employees)
    }

    await pool.query('DELETE FROM role WHERE id = $1', [role_id]);
    console.log('Role deleted!');
  } catch (error) {
    console.error("Error deleting role:", error);
  }
}

async function DeleteDepartment() {
  try {
    const departments = await pool.query('SELECT * FROM department');
    const { department_id } = await inquirer.prompt([
      {
        type: 'list',
        name: 'department_id',
        message: 'Select the department to delete:',
        choices: departments.rows.map(d => ({ name: d.name, value: d.id })),
      },
    ]);

    // Check if any roles are in this department before deleting
    const rolesInDepartment = await pool.query('SELECT * FROM role WHERE department_id = $1', [department_id]);
    if (rolesInDepartment.rows.length > 0) {
      console.log("Cannot delete department. Roles are currently assigned to this department. Update roles first.");
      return;
    }

    await pool.query('DELETE FROM department WHERE id = $1', [department_id]);
    console.log('Department deleted!');
  } catch (error) {
    console.error("Error deleting department:", error);
  }
}

async function startApp() {
  await initializeDB();

  while (true) {
    try {
      const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [  
          'View all departments',
          'View all roles',
          'View all employees',
          'View all managers',
          'Add a department',
          'Add a role',
          'Add a manager',
          'Add an employee',
          'Update an employee role',
          'Update an employee manager',
          'Delete a manager',
          'Delete an employee',
          'Delete a role',       
          'Delete a department',  
          'Quit',
        ],
      });

      if (action === 'Quit') {
        console.log('Goodbye!');
        pool.end();
        break;
      }

      switch (action) {
        case 'View all departments': await ViewAllDepartments(); break;
        case 'View all roles': await ViewAllRoles(); break;
        case 'View all employees': await ViewAllEmployees(); break;
        case 'View all managers': await ViewAllManagers(); break;
        case 'Add a department': await AddDepartment(); break;
        case 'Add a role': await AddRole(); break;
        case 'Add a manager': await AddManager(); break
        case 'Add an employee': await AddEmployee(); break;
        case 'Update an employee role': await UpdateEmployeeRole(); break;
        case 'Update an employee manager': await UpdateEmployeeManager(); break;
        case 'Delete a manager': await DeleteManager(); break
        case 'Delete an employee': await DeleteEmployee(); break; 
        case 'Delete a role': await DeleteRole(); break;         
        case 'Delete a department': await DeleteDepartment(); break;
        default: console.log("Invalid action");
      }
    } catch (err) {
      console.error("An error occurred in startApp:", err);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
    }
  }
}

startApp();
