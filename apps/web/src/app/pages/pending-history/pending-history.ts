import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  imports: [RouterLink, MatButtonModule],
  styleUrl: './pending-history.scss',
  templateUrl: './pending-history.html',
})
export class PendingHistory {}
