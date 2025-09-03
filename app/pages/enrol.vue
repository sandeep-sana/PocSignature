<template>
  <div class="employee-list">
    <div class="header">
      <h1>Employee List</h1>
      <button class="add-btn" type="button" @click="show = true">+ Add Signature</button>
    </div>

    <table class="emp-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Email</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(employee, index) in enrol.list">
          <td>{{ index++ }}</td>
          <td>{{employee.name}}</td>
          <td>{{employee.email}}</td>
          <td><button class="edit-btn" type="button" @click="edit(employee._id)">Edit</button></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Option A: separate close event -->
  <Add_Signature v-if="show" :_id="enrol._id" @close="show = false" />

  <!-- Option B: v-model (if you update the child, see below) -->
  <!-- <Add_Signature v-model:show="show" /> -->
</template>

<script setup>
import { ref } from 'vue'
import Add_Signature from '../../modal/add-signature.vue'
import api from '~~/api.config'
import CONFIG from '~~/config'

const show = ref(false)

const enrol = reactive({
  list: [],
  _id: null,
})

const employeeList = async() => {
  try {
    const response = await api.get(`${CONFIG.API}/api/employee/employee`);
    enrol.list = response.data.list;
    
  } catch (error) {
    console.log(error);
  }
}

const edit = (_id) => {
  show.value = true;
  enrol._id = _id;
}

onMounted(employeeList)
</script>


<style scoped>
.employee-list {
  padding: 1.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.add-btn {
  background: #22c55e; /* green */
  color: #fff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}
.add-btn:hover {
  background: #16a34a;
}

.emp-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}
.emp-table th,
.emp-table td {
  border: 1px solid #ddd;
  padding: 0.75rem;
  text-align: left;
}
.emp-table th {
  background: #f1f5f9;
}
.emp-table img {
  max-height: 40px;
}
.edit-btn {
  background: #0ea5e9; /* blue */
  color: #fff;
  border: none;
  padding: 0.4rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
}
.edit-btn:hover {
  background: #0284c7;
}
</style>
