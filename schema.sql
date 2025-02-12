-- Drop and recreate the database (if you want a fresh start - be careful in production!)
drop database if exists employee_tracker;
create database employee_tracker;
\c employee_tracker;

-- Create the tables (as you already have)
create table department (
    id INT PRIMARY KEY AUTO_INCREMENT, -- Or SERIAL PRIMARY KEY in PostgreSQL
    name varchar(30)
);

create table role (
    id serial primary key,
    title varchar(30),
    salary decimal(10, 2),
    department_id int,
    foreign key (department_id) references department(id)
);

create table employee (
    id serial primary key,
    first_name varchar(30),
    last_name varchar(30),
    role_id int,
    manager_id int,
    foreign key (role_id) references role(id),
    foreign key (manager_id) references employee(id)
);