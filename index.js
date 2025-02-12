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

async function AddEmployee() {
  try {
    const roles = await pool.query('SELECT * FROM role');
    const employees = await pool.query('SELECT * FROM employee');

    const managerChoices = [{ name: "None", value: null }, ...employees.rows.map(employee => ({ name: `${employee.first_name} ${employee.last_name}`, value: employee.id }))];

    const { first_name, last_name, role_id, manager_id } = await inquirer.prompt([
      { type: 'input', name: 'first_name', message: 'Enter the employee\'s first name:' },
      { type: 'input', name: 'last_name', message: 'Enter the employee\'s last name:' },
      {
        type: 'list',
        name: 'role_id',
        message: 'Select the employee\'s role:',
        choices: roles.rows.map(role => ({ name: role.title, value: role.id })),
      },
      {
        type: 'list',
        name: 'manager_id',
        message: 'Select the employee\'s manager:',
        choices: managerChoices, // Use the correct choices array
      },
    ]);
    await pool.query('INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)', [first_name, last_name, role_id, manager_id]);
    console.log(`Employee Added! "${first_name} ${last_name}"`);
  } catch (err) {
    console.error("Error adding employee:", err);
  }
}

async function AddManager() {
  try {
    const employees = await pool.query('SELECT * FROM employee');
    const { manager_id } = await inquirer.prompt([
      {
        type: 'list',
        name: 'manager_id',
        message: 'Select the manager for the new employee:',
        choices: employees.rows.map(e => ({ name: `${e.first_name} ${e.last_name}`, value: e.id })),
      },
    ]);
    return manager_id;
  } catch (error) {
    console.error("Error adding manager:", error);
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
          'Add a department',
          'Add a role',
          'Add an employee',
          'Add a manager',
          'Update an employee role',
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
        case 'Add a department': await AddDepartment(); break;
        case 'Add a role': await AddRole(); break;
        case 'Add an employee': await AddEmployee(); break;
        case 'Add a manager': await AddManager(); break;
        case 'Update an employee role': await UpdateEmployeeRole(); break;
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