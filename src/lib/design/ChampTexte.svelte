<script lang="ts">
  let {
    label,
    name,
    valeur = '',
    type = 'text',
    requis = false,
    erreur = '',
    aide = '',
    autocomplete,
    inputmode,
    placeholder,
    minlength,
    maxlength
  }: {
    label: string;
    name: string;
    valeur?: string;
    type?: string;
    requis?: boolean;
    erreur?: string;
    aide?: string;
    autocomplete?: import('svelte/elements').FullAutoFill | null;
    inputmode?: 'decimal' | 'numeric' | 'tel' | 'text';
    placeholder?: string;
    minlength?: number;
    maxlength?: number;
  } = $props();

  const id = $derived(`champ-${name}`);
</script>

<div class="champ-v2">
  <label for={id}>{label}{#if requis}<span aria-hidden="true"> *</span>{/if}</label>
  <input
    {id}
    {name}
    {type}
    value={valeur}
    required={requis}
    {autocomplete}
    {inputmode}
    {placeholder}
    {minlength}
    {maxlength}
    aria-invalid={erreur ? 'true' : undefined}
    aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
  />
  {#if erreur}<p class="erreur" id="{id}-erreur" role="alert">{erreur}</p>{/if}
  {#if aide && !erreur}<p class="aide" id="{id}-aide">{aide}</p>{/if}
</div>

<style>
  .champ-v2 { display: grid; gap: 6px; }
  label { font-weight: 600; }
  input { min-height: 48px; font: inherit; padding: 10px 14px; border: 1.5px solid var(--bord-fort); border-radius: 12px; width: 100%; background: #fff; color: var(--encre); transition: border-color var(--transition), box-shadow var(--transition); }
  input:focus { border-color: var(--primaire); box-shadow: 0 0 0 3px rgb(20 17 15 / 0.08); outline: none; }
  input[aria-invalid='true'] { border-color: var(--terracotta); }
  .erreur { margin: 0; color: var(--terracotta-fonce); font-weight: 600; font-size: 0.95rem; }
  .aide { margin: 0; color: var(--encre-douce); font-size: 0.95rem; }
</style>
