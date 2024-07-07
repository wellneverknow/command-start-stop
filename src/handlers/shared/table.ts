export function assignTableComment({ taskDeadline, registeredWallet, isTaskStale, daysElapsedSinceTaskCreation }: AssignTableCommentParams) {
  let taskStaleWarning = ``;
  if (isTaskStale) {
    taskStaleWarning = `<tr><td>Warning!</td> <td>This task was created over ${daysElapsedSinceTaskCreation} days ago. Please confirm that this issue specification is accurate before starting.</td></tr>`;
  }
  let deadlineWarning = ``;
  if (taskDeadline) {
    deadlineWarning = `<tr><td>Deadline</td><td>${taskDeadline}</td></tr>`;
  }

  return `
  <code>
  <table>
  ${taskStaleWarning}
  ${deadlineWarning}
  <tr>
  <td>Registered Wallet</td>
  <td>${registeredWallet}</td>
  </tr>
  </table>
  </code>
  `;
}

interface AssignTableCommentParams {
  taskDeadline: string | null;
  registeredWallet: string;
  isTaskStale: boolean;
  daysElapsedSinceTaskCreation: number;
}
